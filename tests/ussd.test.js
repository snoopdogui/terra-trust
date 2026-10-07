import { describe, expect, it } from 'vitest';
import { render, startSession, step, USSD_MAX_CHARS } from '../src/core/ussd.js';
import { createTrustState, setConsent, withdrawAllConsent } from '../src/core/trustState.js';
import { getLevel } from '../src/core/consentLedger.js';
import { generateDataset } from '../src/core/syntheticData.js';
import { DATA_CATEGORIES, PURPOSES } from '../src/core/constants.js';

const ds = generateDataset();
const id = ds.farmers[0].id;
const freshTrust = () => createTrustState({ initialConsent: structuredClone(ds.initialConsent), seed: ds.meta.seed });

// Drive the machine and apply effects to a trust state, as the UI does.
function drive(trust, session, inputs) {
  let t = trust;
  let s = session;
  for (const input of inputs) {
    const r = step(s, t.ledger, input);
    for (const e of r.effects) {
      t = e.type === 'setConsent' ? setConsent(t, e.change) : withdrawAllConsent(t, { farmerId: e.farmerId, channel: e.channel });
    }
    s = r.session;
  }
  return { trust: t, session: s };
}

describe('USSD state machine', () => {
  it('starts on the main menu', () => {
    const t = freshTrust();
    const text = render(startSession(id), t.ledger);
    expect(text).toContain('1 View my consent');
    expect(text).toContain('2 Change consent');
    expect(text).toContain('3 Withdraw all');
  });

  it('shows the current level for each purpose when viewing consent', () => {
    const t = freshTrust();
    const { session } = drive(t, startSession(id), ['1', '2']); // view, Yield
    const text = render(session, t.ledger);
    expect(text.startsWith('Yield')).toBe(true);
    expect(text).toMatch(/EUDR: (None|Aggregate|Cooperative)/);
  });

  it('changes consent through the same ledger the web form uses', () => {
    const t = freshTrust();
    const target = getLevel(t.ledger, id, 'yield', 'price_benchmarking') === 'none' ? 'aggregate' : 'none';
    const levelKey = target === 'none' ? '1' : '2';
    const { trust, session } = drive(t, startSession(id), ['2', '2', '2', levelKey, '1']); // change, Yield, purpose 2, level, confirm
    expect(getLevel(trust.ledger, id, 'yield', 'price_benchmarking')).toBe(target);
    expect(trust.ledger.events.at(-1)).toMatchObject({ channel: 'ussd', farmerId: id, to: target });
    expect(session.screen).toBe('main');
    expect(session.notice).toBe('Saved.');
  });

  it('writes nothing when the farmer answers No at confirmation', () => {
    const t = freshTrust();
    const { trust, session } = drive(t, startSession(id), ['2', '2', '1', '3', '2']);
    expect(trust.ledger.events).toHaveLength(0);
    expect(session.notice).toBe('Cancelled.');
  });

  it('reports no change when the chosen level is already set', () => {
    const t = freshTrust();
    const current = getLevel(t.ledger, id, 'price', 'eudr_due_diligence');
    const key = { none: '1', aggregate: '2', cooperative: '3' }[current];
    const { trust, session } = drive(t, startSession(id), ['2', '3', '1', key, '1']);
    expect(trust.ledger.events).toHaveLength(0);
    expect(session.notice).toBe('No change.');
  });

  it('withdraws all consent after confirmation', () => {
    const t = freshTrust();
    const { trust } = drive(t, startSession(id), ['3', '1']);
    for (const c of DATA_CATEGORIES) for (const p of PURPOSES) expect(getLevel(trust.ledger, id, c.id, p.id)).toBe('none');
  });

  it('keeps the screen and says so on invalid input', () => {
    const t = freshTrust();
    const s0 = startSession(id);
    for (const bad of ['', 'abc', '9', '1.5', '01']) {
      const r = step(s0, t.ledger, bad);
      expect(r.session.screen).toBe('main');
      expect(r.text.startsWith('Invalid choice.')).toBe(true);
      expect(r.effects).toEqual([]);
    }
  });

  it('goes back one level with 0 and ends with 0 on the main menu', () => {
    const t = freshTrust();
    const { session } = drive(t, startSession(id), ['2', '1', '0', '0']);
    expect(session.screen).toBe('main');
    const end = step(session, t.ledger, '0');
    expect(end.ended).toBe(true);
    expect(end.text).toBe('Session ended.');
  });

  it('never produces a screen longer than the limit, including notices', () => {
    const t = freshTrust();
    const seen = new Set();
    const queue = [startSession(id)];
    let longest = 0;
    while (queue.length) {
      const s = queue.shift();
      const key = JSON.stringify(s);
      if (seen.has(key)) continue;
      seen.add(key);
      longest = Math.max(longest, render(s, t.ledger).length);
      for (const input of ['0', '1', '2', '3', 'x']) {
        const r = step(s, t.ledger, input);
        if (!r.ended) queue.push(r.session);
        longest = Math.max(longest, r.text.length);
      }
    }
    expect(seen.size).toBeGreaterThan(20);
    expect(longest).toBeLessThanOrEqual(USSD_MAX_CHARS);
  });
});
