import { describe, expect, it } from 'vitest';
import { createRevenueState, recordRevenue, revenueTotals, setSplit, splitAmount, validateSplit } from '../src/core/revenue.js';
import { buildFixture } from '../src/core/evaluation/fixture.js';
import { createTrustState, setRevenueSplit, submitQuery } from '../src/core/trustState.js';

describe('splitAmount', () => {
  it('always sums to the total exactly', () => {
    for (const total of [0, 1, 7, 99, 100, 12000, 12001, 33333]) {
      for (const weights of [[60, 25, 15], [1, 1, 1], [33, 33, 34], [0, 50, 50], [100, 0, 0], [1, 1, 1, 1, 1, 1, 1]]) {
        const shares = splitAmount(total, weights);
        expect(shares.reduce((a, b) => a + b, 0)).toBe(total);
        for (const s of shares) expect(Number.isInteger(s) && s >= 0).toBe(true);
      }
    }
  });

  it('is proportional when it divides evenly and gives remainders to the largest fractions', () => {
    expect(splitAmount(12000, [60, 25, 15])).toEqual([7200, 3000, 1800]);
    expect(splitAmount(10, [1, 1, 1])).toEqual([4, 3, 3]);
    expect(splitAmount(5, [0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe('split validation', () => {
  it('accepts whole numbers that add to 100', () => {
    expect(validateSplit({ farmers: 60, cooperative: 25, trust: 15 })).toBeNull();
    expect(validateSplit({ farmers: 100, cooperative: 0, trust: 0 })).toBeNull();
  });
  it('rejects totals other than 100, negatives and fractions', () => {
    expect(validateSplit({ farmers: 60, cooperative: 25, trust: 20 })).toMatch(/105%/);
    expect(validateSplit({ farmers: -10, cooperative: 60, trust: 50 })).toMatch(/whole number/);
    expect(validateSplit({ farmers: 60.5, cooperative: 24.5, trust: 15 })).toMatch(/whole number/);
    expect(validateSplit(null)).toBeTruthy();
  });
  it('ignores an invalid split', () => {
    const s = createRevenueState();
    expect(setSplit(s, { farmers: 10, cooperative: 10, trust: 10 })).toBe(s);
  });
});

describe('revenue ledger', () => {
  const contributors = (n, coop) => Array.from({ length: n }, (_, i) => ({ id: `${coop}-${i}`, cooperativeId: coop }));

  it('splits a fee, shares the farmer pool equally and conserves every pesewa', () => {
    let s = createRevenueState({ farmers: 60, cooperative: 25, trust: 15 });
    s = recordRevenue(s, { queryId: 1, feePesewas: 12001, contributors: [...contributors(3, 'a'), ...contributors(1, 'b')] });
    const t = revenueTotals(s);
    expect(t.total).toBe(12001);
    expect(t.farmers + t.cooperative + t.trust).toBe(12001);
    expect(s.entries[0].farmersPool + s.entries[0].coopPool + s.entries[0].trustPool).toBe(12001);
    const shares = Object.values(s.farmerBalances);
    expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
    expect(s.coopBalances.a).toBeGreaterThan(s.coopBalances.b);
  });

  it('applies a new split to later queries only', () => {
    let s = createRevenueState({ farmers: 60, cooperative: 25, trust: 15 });
    s = recordRevenue(s, { queryId: 1, feePesewas: 10000, contributors: contributors(10, 'a') });
    s = setSplit(s, { farmers: 80, cooperative: 10, trust: 10 });
    s = recordRevenue(s, { queryId: 2, feePesewas: 10000, contributors: contributors(10, 'a') });
    expect(s.entries[0].split.farmers).toBe(60);
    expect(s.entries[1].split.farmers).toBe(80);
    expect(s.entries[0].farmersPool).toBe(6000);
    expect(s.entries[1].farmersPool).toBe(8000);
  });

  it('records nothing when there are no contributors or no fee', () => {
    const s = createRevenueState();
    expect(recordRevenue(s, { queryId: 1, feePesewas: 5000, contributors: [] })).toBe(s);
    expect(recordRevenue(s, { queryId: 1, feePesewas: 0, contributors: contributors(10, 'a') })).toBe(s);
  });
});

describe('revenue through the trust state', () => {
  it('earns fees only for released queries, and balances always add up to total fees', () => {
    const fx = buildFixture();
    const ctx = { dataset: fx.dataset, buyers: fx.buyers };
    let st = createTrustState({ initialConsent: fx.initialConsent });
    const base = { buyerId: 'buyer-1', purpose: 'supply_chain_planning', queryType: 'mean_yield', filter: {}, groupBy: null };
    const requests = [
      { ...base, filter: { zone: ['A1'] } }, // released
      { ...base, filter: { zone: ['B1'] } }, // refused
      { ...base, filter: { cooperative: ['fx-c'] }, queryType: 'count_farmers' }, // released
      { ...base, purpose: 'price_benchmarking', queryType: 'mean_price', filter: { zone: ['C1'] } }, // released
    ];
    for (const r of requests) st = submitQuery(st, ctx, r, 0).state;
    st = setRevenueSplit(st, { farmers: 70, cooperative: 20, trust: 10 });
    st = submitQuery(st, ctx, { ...base, filter: { zone: ['A2'] } }, 0).state;

    const released = st.audit.filter((e) => e.decision === 'allow');
    expect(released).toHaveLength(4);
    const feeSum = released.reduce((a, e) => a + e.feePesewas, 0);
    const t = revenueTotals(st.revenue);
    expect(t.total).toBe(feeSum);
    expect(t.farmers + t.cooperative + t.trust).toBe(feeSum);
    expect(st.revenue.entries).toHaveLength(4);
  });

  it('refuses nothing it should release because of revenue, and ignores invalid splits', () => {
    const fx = buildFixture();
    let st = createTrustState({ initialConsent: fx.initialConsent });
    expect(setRevenueSplit(st, { farmers: 1, cooperative: 1, trust: 1 })).toBe(st);
  });
});
