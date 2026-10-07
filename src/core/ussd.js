// USSD menu as a pure state machine. A farmer on a feature phone navigates numbered menus.
// The machine never touches the ledger itself: it returns "effects" that the caller applies,
// so the web form and the phone both write through the same consent ledger.
//
// Real USSD screens are short. The limit varies by network, so 160 characters is used here as a
// conservative figure. Check the figure for any real operator before relying on it.

import { CONSENT_LEVELS, DATA_CATEGORIES, PURPOSES } from './constants.js';
import { getLevel } from './consentLedger.js';

export const USSD_MAX_CHARS = 160;

const CATEGORY_NAME = { plot_location: 'Plot location', yield: 'Yield', price: 'Price' };
const PURPOSE_SHORT = { eudr_due_diligence: 'EUDR', price_benchmarking: 'Price bench.', supply_chain_planning: 'Supply plan' };
const PURPOSE_MENU = { eudr_due_diligence: 'EUDR', price_benchmarking: 'Price benchmarking', supply_chain_planning: 'Supply planning' };
const LEVEL_NAME = Object.fromEntries(CONSENT_LEVELS.map((l) => [l.id, l.ussd]));

export function startSession(farmerId) {
  return { farmerId, screen: 'main', category: null, purpose: null, level: null, notice: '' };
}

function menu(title, lines) {
  return [title, ...lines.map((l, i) => `${i + 1} ${l}`), '0 Back'].join('\n');
}

export function render(session, ledger) {
  const prefix = session.notice ? `${session.notice}\n` : '';
  let body;
  switch (session.screen) {
    case 'main':
      body = ['Terra Trust (synthetic)', '1 View my consent', '2 Change consent', '3 Withdraw all', '0 Exit'].join('\n');
      break;
    case 'view_categories':
      body = menu('View consent', DATA_CATEGORIES.map((c) => CATEGORY_NAME[c.id]));
      break;
    case 'view_detail': {
      const lines = PURPOSES.map(
        (p) => `${PURPOSE_SHORT[p.id]}: ${LEVEL_NAME[getLevel(ledger, session.farmerId, session.category, p.id)]}`,
      );
      body = [CATEGORY_NAME[session.category], ...lines, '0 Back'].join('\n');
      break;
    }
    case 'change_category':
      body = menu('Change consent', DATA_CATEGORIES.map((c) => CATEGORY_NAME[c.id]));
      break;
    case 'change_purpose':
      body = menu(`${CATEGORY_NAME[session.category]}: purpose?`, PURPOSES.map((p) => PURPOSE_MENU[p.id]));
      break;
    case 'change_level': {
      const now = LEVEL_NAME[getLevel(ledger, session.farmerId, session.category, session.purpose)];
      body = [
        `${CATEGORY_NAME[session.category]}, ${PURPOSE_SHORT[session.purpose]}`,
        `Now: ${now}`,
        ...CONSENT_LEVELS.map((l, i) => `${i + 1} ${l.ussd}`),
        '0 Back',
      ].join('\n');
      break;
    }
    case 'confirm':
      body = `Set ${CATEGORY_NAME[session.category]} for ${PURPOSE_SHORT[session.purpose]} to ${LEVEL_NAME[session.level]}?\n1 Yes\n2 No`;
      break;
    case 'withdraw_confirm':
      body = 'Withdraw ALL consent? No buyer can then use your data.\n1 Yes\n2 No';
      break;
    case 'ended':
      body = 'Session ended.';
      break;
    default:
      body = 'Error.';
  }
  return prefix + body;
}

function pickIndex(input, length) {
  if (!/^[1-9]$/.test(input)) return -1;
  const n = Number(input) - 1;
  return n < length ? n : -1;
}

/**
 * Advance the session by one reply.
 * Returns { session, effects, text, ended }. Effects are applied by the caller.
 */
export function step(session, ledger, rawInput) {
  const input = String(rawInput ?? '').trim();
  const next = { ...session, notice: '' };
  const effects = [];
  const invalid = () => ({ ...session, notice: 'Invalid choice.' });
  let result = null;

  switch (session.screen) {
    case 'main':
      if (input === '1') result = { ...next, screen: 'view_categories' };
      else if (input === '2') result = { ...next, screen: 'change_category' };
      else if (input === '3') result = { ...next, screen: 'withdraw_confirm' };
      else if (input === '0') result = { ...next, screen: 'ended' };
      break;
    case 'view_categories': {
      const i = pickIndex(input, DATA_CATEGORIES.length);
      if (i >= 0) result = { ...next, screen: 'view_detail', category: DATA_CATEGORIES[i].id };
      else if (input === '0') result = { ...next, screen: 'main', category: null };
      break;
    }
    case 'view_detail':
      if (input === '0') result = { ...next, screen: 'view_categories' };
      break;
    case 'change_category': {
      const i = pickIndex(input, DATA_CATEGORIES.length);
      if (i >= 0) result = { ...next, screen: 'change_purpose', category: DATA_CATEGORIES[i].id };
      else if (input === '0') result = { ...next, screen: 'main', category: null };
      break;
    }
    case 'change_purpose': {
      const i = pickIndex(input, PURPOSES.length);
      if (i >= 0) result = { ...next, screen: 'change_level', purpose: PURPOSES[i].id };
      else if (input === '0') result = { ...next, screen: 'change_category', purpose: null };
      break;
    }
    case 'change_level': {
      const i = pickIndex(input, CONSENT_LEVELS.length);
      if (i >= 0) result = { ...next, screen: 'confirm', level: CONSENT_LEVELS[i].id };
      else if (input === '0') result = { ...next, screen: 'change_purpose', level: null };
      break;
    }
    case 'confirm':
      if (input === '1') {
        const current = getLevel(ledger, session.farmerId, session.category, session.purpose);
        if (current === session.level) {
          result = { ...next, screen: 'main', category: null, purpose: null, level: null, notice: 'No change.' };
        } else {
          effects.push({
            type: 'setConsent',
            change: {
              farmerId: session.farmerId,
              category: session.category,
              purpose: session.purpose,
              level: session.level,
              channel: 'ussd',
            },
          });
          result = { ...next, screen: 'main', category: null, purpose: null, level: null, notice: 'Saved.' };
        }
      } else if (input === '2') {
        result = { ...next, screen: 'main', category: null, purpose: null, level: null, notice: 'Cancelled.' };
      }
      break;
    case 'withdraw_confirm':
      if (input === '1') {
        effects.push({ type: 'withdrawAll', farmerId: session.farmerId, channel: 'ussd' });
        result = { ...next, screen: 'main', notice: 'All consent withdrawn.' };
      } else if (input === '2') {
        result = { ...next, screen: 'main', notice: 'Cancelled.' };
      }
      break;
    default:
      break;
  }

  const out = result ?? invalid();
  return { session: out, effects: result ? effects : [], text: render(out, ledger), ended: out.screen === 'ended' };
}
