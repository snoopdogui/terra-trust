// Consent ledger: an append-only event log plus the current state derived from it.
// Pure functions. Every function returns a new ledger and never mutates its input.
//
// A consent cell is one (data category, purpose) pair for one farmer. Each cell holds a level:
//   none         nothing is shared
//   aggregate    may contribute to aggregate results pooled across the trust
//   cooperative  may also contribute to results reported per cooperative
// Unknown farmers or cells read as "none": the ledger fails closed.

import { CONSENT_LEVELS, DATA_CATEGORIES, LEVEL_RANK, PURPOSES } from './constants.js';

const EVENT_CAP = 1000; // keep the stored log small in localStorage

const CATEGORY_IDS = new Set(DATA_CATEGORIES.map((c) => c.id));
const PURPOSE_IDS = new Set(PURPOSES.map((p) => p.id));

export function createLedger(initialConsent) {
  return { effective: initialConsent, events: [], seq: 0 };
}

export function getLevel(ledger, farmerId, category, purpose) {
  return ledger.effective[farmerId]?.[category]?.[purpose] ?? 'none';
}

export function levelAtLeast(level, required) {
  return (LEVEL_RANK[level] ?? -1) >= LEVEL_RANK[required];
}

function assertCell(ledger, { farmerId, category, purpose, level }) {
  if (!ledger.effective[farmerId]) throw new Error(`Unknown farmer: ${farmerId}`);
  if (!CATEGORY_IDS.has(category)) throw new Error(`Unknown data category: ${category}`);
  if (!PURPOSE_IDS.has(purpose)) throw new Error(`Unknown purpose: ${purpose}`);
  if (!(level in LEVEL_RANK)) throw new Error(`Unknown consent level: ${level}`);
}

function applyChange(ledger, change) {
  const { farmerId, category, purpose, level, channel = 'web', at = null } = change;
  const from = getLevel(ledger, farmerId, category, purpose);
  if (from === level) return ledger;
  const seq = ledger.seq + 1;
  const farmer = ledger.effective[farmerId];
  const effective = {
    ...ledger.effective,
    [farmerId]: { ...farmer, [category]: { ...farmer[category], [purpose]: level } },
  };
  const events = [...ledger.events, { seq, at, farmerId, category, purpose, from, to: level, channel }].slice(-EVENT_CAP);
  return { effective, events, seq };
}

/** Set one consent cell. Returns the same ledger object when nothing changes. */
export function setConsent(ledger, change) {
  assertCell(ledger, change);
  return applyChange(ledger, change);
}

/** Withdraw every cell for one farmer. Only cells that were not already "none" create events. */
export function withdrawAll(ledger, { farmerId, channel = 'web', at = null }) {
  if (!ledger.effective[farmerId]) throw new Error(`Unknown farmer: ${farmerId}`);
  let next = ledger;
  for (const category of DATA_CATEGORIES) {
    for (const purpose of PURPOSES) {
      next = applyChange(next, { farmerId, category: category.id, purpose: purpose.id, level: 'none', channel, at });
    }
  }
  return next;
}

/** Count levels per (category, purpose) cell across the given farmers (default: everyone). */
export function countConsent(ledger, farmerIds = Object.keys(ledger.effective)) {
  const cells = [];
  for (const category of DATA_CATEGORIES) {
    for (const purpose of PURPOSES) {
      const counts = Object.fromEntries(CONSENT_LEVELS.map((l) => [l.id, 0]));
      for (const id of farmerIds) counts[getLevel(ledger, id, category.id, purpose.id)] += 1;
      cells.push({ category: category.id, purpose: purpose.id, ...counts, total: farmerIds.length });
    }
  }
  return cells;
}

export function eventsForFarmer(ledger, farmerId) {
  return ledger.events.filter((e) => e.farmerId === farmerId);
}
