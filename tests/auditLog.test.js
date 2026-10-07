import { describe, expect, it } from 'vitest';
import { EMPTY_CRITERIA, filterAudit, summariseAudit } from '../src/core/auditLog.js';
import { buildFixture } from '../src/core/evaluation/fixture.js';
import { createTrustState, submitQuery } from '../src/core/trustState.js';

function sample() {
  const fx = buildFixture();
  const ctx = { dataset: fx.dataset, buyers: fx.buyers };
  let st = createTrustState({ initialConsent: fx.initialConsent });
  const base = { buyerId: 'buyer-1', purpose: 'supply_chain_planning', queryType: 'mean_yield', filter: {}, groupBy: null };
  const reqs = [
    { ...base, filter: { zone: ['A3'] } }, // 1 released
    { ...base, filter: { zone: ['B1'] } }, // 2 too small
    { ...base, buyerId: 'buyer-3', purpose: 'eudr_due_diligence' }, // 3 purpose
    { ...base, buyerId: 'buyer-2', purpose: 'price_benchmarking', queryType: 'mean_price', filter: { zone: ['C1'] } }, // 4 released
    { ...base, filter: { zone: ['A1'] } }, // 5 released
    { ...base, filter: { zone: ['A1'], ageBand: ['18-34', '35-44', '45-54', '55-64'] } }, // 6 differencing
  ];
  for (const r of reqs) st = submitQuery(st, ctx, r, 0).state;
  return st.audit;
}

describe('audit log filtering', () => {
  const audit = sample();

  it('returns everything, newest first, with no criteria', () => {
    expect(filterAudit(audit, EMPTY_CRITERIA).map((e) => e.id)).toEqual([6, 5, 4, 3, 2, 1]);
  });

  it('filters by decision, reason code, buyer and purpose', () => {
    expect(filterAudit(audit, { decision: 'allow' }).map((e) => e.id)).toEqual([5, 4, 1]);
    expect(filterAudit(audit, { code: 'COHORT_TOO_SMALL' }).map((e) => e.id)).toEqual([2]);
    expect(filterAudit(audit, { code: 'DIFFERENCING_RISK' }).map((e) => e.id)).toEqual([6]);
    expect(filterAudit(audit, { buyerId: 'buyer-3' }).map((e) => e.id)).toEqual([3]);
    expect(filterAudit(audit, { purpose: 'price_benchmarking' }).map((e) => e.id)).toEqual([4]);
  });

  it('combines criteria and searches free text in reasons and selections', () => {
    expect(filterAudit(audit, { decision: 'refuse', buyerId: 'buyer-1' }).map((e) => e.id)).toEqual([6, 2]);
    expect(filterAudit(audit, { text: 'earlier query' }).map((e) => e.id)).toEqual([6]);
    expect(filterAudit(audit, { text: 'zone: c1' }).map((e) => e.id)).toEqual([4]);
    expect(filterAudit(audit, { text: 'no such thing' })).toEqual([]);
  });

  it('summarises counts by reason', () => {
    const s = summariseAudit(audit);
    expect(s).toMatchObject({ total: 6, released: 3, refused: 3 });
    expect(s.byCode).toMatchObject({ OK: 3, COHORT_TOO_SMALL: 1, PURPOSE_NOT_PERMITTED: 1, DIFFERENCING_RISK: 1 });
  });

  it('does not change the original list', () => {
    const copy = JSON.stringify(audit);
    filterAudit(audit, { decision: 'refuse' });
    expect(JSON.stringify(audit)).toBe(copy);
  });
});
