import { describe, expect, it } from 'vitest';
import {
  countConsent,
  createLedger,
  eventsForFarmer,
  getLevel,
  levelAtLeast,
  setConsent,
  withdrawAll,
} from '../src/core/consentLedger.js';
import { generateDataset } from '../src/core/syntheticData.js';
import { DATA_CATEGORIES, PURPOSES } from '../src/core/constants.js';

const ds = generateDataset();
const fresh = () => createLedger(structuredClone(ds.initialConsent));
const id = ds.farmers[0].id;

describe('consent ledger', () => {
  it('reads the initial consent and fails closed for unknown cells', () => {
    const ledger = fresh();
    expect(['none', 'aggregate', 'cooperative']).toContain(getLevel(ledger, id, 'yield', 'eudr_due_diligence'));
    expect(getLevel(ledger, 'NOT-A-FARMER', 'yield', 'eudr_due_diligence')).toBe('none');
    expect(getLevel(ledger, id, 'not-a-category', 'eudr_due_diligence')).toBe('none');
  });

  it('applies a change immediately and records an event with before and after', () => {
    const ledger = setConsent(fresh(), { farmerId: id, category: 'yield', purpose: 'price_benchmarking', level: 'none', channel: 'ussd', at: 't1' });
    const next = setConsent(ledger, { farmerId: id, category: 'yield', purpose: 'price_benchmarking', level: 'cooperative', channel: 'web', at: 't2' });
    expect(getLevel(next, id, 'yield', 'price_benchmarking')).toBe('cooperative');
    const last = next.events.at(-1);
    expect(last).toMatchObject({ farmerId: id, from: 'none', to: 'cooperative', channel: 'web', at: 't2' });
    expect(next.seq).toBe(ledger.seq + 1);
  });

  it('does not mutate the previous ledger', () => {
    const before = fresh();
    const snapshot = JSON.stringify(before);
    setConsent(before, { farmerId: id, category: 'price', purpose: 'eudr_due_diligence', level: 'cooperative' });
    withdrawAll(before, { farmerId: id });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('returns the same ledger when the level does not change', () => {
    const ledger = fresh();
    const current = getLevel(ledger, id, 'yield', 'eudr_due_diligence');
    expect(setConsent(ledger, { farmerId: id, category: 'yield', purpose: 'eudr_due_diligence', level: current })).toBe(ledger);
  });

  it('rejects unknown farmers, categories, purposes and levels', () => {
    const ledger = fresh();
    expect(() => setConsent(ledger, { farmerId: 'nope', category: 'yield', purpose: 'eudr_due_diligence', level: 'none' })).toThrow();
    expect(() => setConsent(ledger, { farmerId: id, category: 'nope', purpose: 'eudr_due_diligence', level: 'none' })).toThrow();
    expect(() => setConsent(ledger, { farmerId: id, category: 'yield', purpose: 'nope', level: 'none' })).toThrow();
    expect(() => setConsent(ledger, { farmerId: id, category: 'yield', purpose: 'eudr_due_diligence', level: 'everything' })).toThrow();
  });

  it('withdraws every cell, logging events only for cells that were not already none', () => {
    const ledger = fresh();
    const nonNone = DATA_CATEGORIES.flatMap((c) => PURPOSES.map((p) => getLevel(ledger, id, c.id, p.id))).filter((l) => l !== 'none').length;
    const next = withdrawAll(ledger, { farmerId: id, channel: 'ussd' });
    for (const c of DATA_CATEGORIES) for (const p of PURPOSES) expect(getLevel(next, id, c.id, p.id)).toBe('none');
    expect(eventsForFarmer(next, id)).toHaveLength(nonNone);
    expect(withdrawAll(next, { farmerId: id })).toBe(next);
  });

  it('counts levels across farmers and responds to changes', () => {
    const ledger = fresh();
    const before = countConsent(ledger).find((c) => c.category === 'yield' && c.purpose === 'eudr_due_diligence');
    expect(before.none + before.aggregate + before.cooperative).toBe(300);
    const level = getLevel(ledger, id, 'yield', 'eudr_due_diligence');
    const target = level === 'none' ? 'aggregate' : 'none';
    const after = countConsent(setConsent(ledger, { farmerId: id, category: 'yield', purpose: 'eudr_due_diligence', level: target })).find((c) => c.category === 'yield' && c.purpose === 'eudr_due_diligence');
    expect(after[target]).toBe(before[target] + 1);
    expect(after[level]).toBe(before[level] - 1);
  });

  it('orders levels', () => {
    expect(levelAtLeast('cooperative', 'aggregate')).toBe(true);
    expect(levelAtLeast('aggregate', 'cooperative')).toBe(false);
    expect(levelAtLeast('none', 'aggregate')).toBe(false);
  });
});
