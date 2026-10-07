import { describe, expect, it } from 'vitest';
import { buildFixture, selectFarmers } from '../src/core/evaluation/fixture.js';
import { createTrustState, setConsent, setMinCohort, submitQuery, withdrawAllConsent } from '../src/core/trustState.js';
import { evaluateQuery, normalizeMinCohort, REASON, validateRequest } from '../src/core/policyEngine.js';
import { findDifferencingConflict, symmetricDifferenceSize } from '../src/core/differencing.js';
import { aggregate } from '../src/core/aggregation.js';
import { DATA_CATEGORIES, PURPOSES } from '../src/core/constants.js';

function world(config) {
  const fx = buildFixture();
  return {
    fx,
    ctx: { dataset: fx.dataset, buyers: fx.buyers },
    state: createTrustState({ initialConsent: fx.initialConsent, config }),
    ask(request) {
      const r = submitQuery(this.state, this.ctx, request, 0);
      this.state = r.state;
      return r.entry;
    },
    set(who, category, purpose, level) {
      for (const f of selectFarmers(this.fx.dataset, who)) {
        this.state = setConsent(this.state, { farmerId: f.id, category, purpose, level });
      }
    },
  };
}
const q = (over) => ({ buyerId: 'buyer-1', purpose: 'supply_chain_planning', queryType: 'mean_yield', filter: {}, groupBy: null, ...over });

describe('policy engine: releasing aggregates', () => {
  it('releases a correct aggregate for a large consenting group', () => {
    const w = world();
    const e = w.ask(q({ filter: { cooperative: ['fx-a'] } }));
    expect(e.decision).toBe('allow');
    expect(e.code).toBe(REASON.OK);
    const farmers = w.fx.dataset.farmers.filter((f) => f.cooperativeId === 'fx-a');
    const mean = Math.round((farmers.reduce((a, f) => a + f.yieldKgHa, 0) / farmers.length) * 10) / 10;
    expect(e.result.rows).toEqual([['All selected farmers', 52, mean]]);
    expect(e.feePesewas).toBe(12000);
  });

  it('never puts an individual record or identifier in a result', () => {
    const w = world();
    const e = w.ask(q({ groupBy: 'cooperative', filter: { cooperative: ['fx-a', 'fx-b', 'fx-c'] } }));
    expect(e.decision).toBe('allow');
    for (const row of e.result.rows) {
      for (const cell of row) expect(typeof cell === 'number' || (typeof cell === 'string' && !/FX-|SYN-/.test(cell))).toBe(true);
    }
  });

  it('computes mean and population standard deviation for price spread', () => {
    const out = aggregate('price_spread', [{ label: 'g', farmers: [{ priceGhsPerKg: 20 }, { priceGhsPerKg: 30 }] }]);
    expect(out.rows[0]).toEqual(['g', 2, 25, 5]);
  });
});

describe('policy engine: refusals and their order', () => {
  it('rejects malformed requests, unknown filters and identifier filters', () => {
    const w = world();
    const bad = [
      q({ purpose: 'marketing' }),
      q({ queryType: 'dump_all' }),
      q({ filter: { farmerId: ['FX-A1-00'] } }),
      q({ filter: { constructor: ['x'] } }),
      q({ filter: { zone: ['NOPE'] } }),
      q({ filter: { zone: [] } }),
      q({ groupBy: 'farmer' }),
      q({ buyerId: 'ghost' }),
    ];
    for (const request of bad) expect(w.ask(request).code).toBe(REASON.INVALID_REQUEST);
    expect(validateRequest(JSON.parse('{"buyerId":"b","purpose":"eudr_due_diligence","queryType":"mean_yield","filter":{"__proto__":["x"]}}'), w.fx.dataset)).toMatch(/not an allowed filter/);
  });

  it('refuses a buyer that is not approved for the purpose, and a query type that does not fit the purpose', () => {
    const w = world();
    expect(w.ask(q({ buyerId: 'buyer-3', purpose: 'eudr_due_diligence' })).code).toBe(REASON.PURPOSE_NOT_PERMITTED);
    expect(w.ask(q({ purpose: 'eudr_due_diligence', queryType: 'mean_price' })).code).toBe(REASON.PURPOSE_NOT_PERMITTED);
  });

  it('refuses when nobody in the selection has consented, and consent is per purpose', () => {
    const w = world();
    w.set({ zone: 'A2' }, 'yield', 'supply_chain_planning', 'none');
    const refused = w.ask(q({ filter: { zone: ['A2'] } }));
    expect(refused.code).toBe(REASON.NO_CONSENT);
    const other = w.ask(q({ purpose: 'eudr_due_diligence', filter: { zone: ['A2'] } }));
    expect(other.decision).toBe('allow');
  });

  it('applies the minimum cohort exactly: 9 is refused, 10 is released', () => {
    const w = world();
    expect(w.ask(q({ filter: { zone: ['B1'] } })).code).toBe(REASON.COHORT_TOO_SMALL);
    expect(w.ask(q({ filter: { zone: ['A3'] } })).decision).toBe('allow');
  });

  it('counts only consenting farmers toward the minimum cohort', () => {
    const w = world();
    w.set({ zone: 'B2', count: 14 }, 'yield', 'supply_chain_planning', 'none'); // 6 of 20 left
    expect(w.ask(q({ filter: { zone: ['B2'] } })).code).toBe(REASON.COHORT_TOO_SMALL);
  });

  it('does not reveal exact counts in refusal messages', () => {
    const w = world();
    const small = w.ask(q({ filter: { zone: ['B1'] } }));
    expect(small.reason).not.toMatch(/\b9\b/);
    const none = (() => {
      w.set({ zone: 'A2' }, 'yield', 'supply_chain_planning', 'none');
      return w.ask(q({ filter: { zone: ['A2'] } }));
    })();
    expect(none.reason).not.toMatch(/\b12\b/);
  });

  it('runs checks in a fixed order and marks later checks as not reached', () => {
    const w = world();
    const e = w.ask(q({ buyerId: 'buyer-3', purpose: 'eudr_due_diligence', filter: { zone: ['B1'] } }));
    expect(e.code).toBe(REASON.PURPOSE_NOT_PERMITTED); // purpose is checked before cohort size
    expect(e.checks.map((c) => c.status)).toEqual(['pass', 'fail', 'skipped', 'skipped', 'skipped']);
  });

  it('requires per-cooperative consent for grouped results', () => {
    const w = world();
    w.set({ cooperative: 'fx-a' }, 'yield', 'supply_chain_planning', 'aggregate');
    expect(w.ask(q({ filter: { cooperative: ['fx-a'] } })).decision).toBe('allow');
    expect(w.ask(q({ filter: { cooperative: ['fx-a'] }, groupBy: 'cooperative' })).code).toBe(REASON.NO_CONSENT);
  });

  it('refuses grouped results if any group is too small', () => {
    const w = world();
    expect(w.ask(q({ groupBy: 'cooperative' })).code).toBe(REASON.COHORT_TOO_SMALL); // fx-d has 4 farmers
  });
});

describe('policy engine: configuration and immediate effect of consent', () => {
  it('uses the configured minimum cohort and clamps unreasonable values', () => {
    let w = world();
    w.state = setMinCohort(w.state, 15);
    expect(w.ask(q({ filter: { zone: ['A2'] } })).code).toBe(REASON.COHORT_TOO_SMALL);
    expect(normalizeMinCohort(1)).toBe(2);
    expect(normalizeMinCohort(500)).toBe(50);
    expect(normalizeMinCohort('abc')).toBe(10);
    w = world({ minCohort: 5 });
    expect(w.ask(q({ filter: { zone: ['B1'] } })).decision).toBe('allow');
  });

  it('takes a withdrawal into account on the very next query', () => {
    const w = world();
    expect(w.ask(q({ filter: { zone: ['A3'] } })).decision).toBe('allow');
    const [farmer] = selectFarmers(w.fx.dataset, { zone: 'A3', index: 0 });
    w.state = withdrawAllConsent(w.state, { farmerId: farmer.id });
    expect(w.ask(q({ filter: { zone: ['A3'] } })).code).toBe(REASON.COHORT_TOO_SMALL);
  });
});

describe('differencing guard', () => {
  it('measures symmetric difference', () => {
    expect(symmetricDifferenceSize(['a', 'b'], ['b', 'c'])).toBe(2);
    expect(symmetricDifferenceSize(['a'], ['a'])).toBe(0);
  });

  it('flags a difference of 1 to k-1 and ignores 0 and k or more', () => {
    const history = [{ queryId: 7, buyerId: 'b', categoryKey: 'yield', cohorts: [{ label: 'all', ids: ['1', '2', '3', '4', '5'] }] }];
    const base = { buyerId: 'b', key: 'yield', windowSize: 10 };
    expect(findDifferencingConflict([{ label: 'all', ids: ['1', '2', '3', '4'] }], history, { ...base, k: 3 })?.queryId).toBe(7);
    expect(findDifferencingConflict([{ label: 'all', ids: ['1', '2', '3', '4', '5'] }], history, { ...base, k: 3 })).toBeNull();
    expect(findDifferencingConflict([{ label: 'all', ids: ['1', '2', '3'] }], history, { ...base, k: 2 })).toBeNull();
    expect(findDifferencingConflict([{ label: 'all', ids: ['1', '2', '3', '4'] }], history, { ...base, k: 3, buyerId: 'other' })).toBeNull();
    expect(findDifferencingConflict([{ label: 'all', ids: ['1', '2', '3', '4'] }], history, { ...base, k: 3, key: 'price' })).toBeNull();
  });

  it('refuses leave-one-out on the same data, even through a different query type', () => {
    const w = world();
    const priceQ = { purpose: 'price_benchmarking', filter: { zone: ['A1'] } };
    expect(w.ask(q({ ...priceQ, queryType: 'mean_price' })).decision).toBe('allow');
    const second = w.ask(q({ purpose: 'price_benchmarking', queryType: 'price_spread', filter: { zone: ['A1'], ageBand: ['18-34', '35-44', '45-54', '55-64'] } }));
    expect(second.code).toBe(REASON.DIFFERENCING_RISK);
  });

  it('allows repeats, large differences and different data categories', () => {
    const w = world();
    expect(w.ask(q({ filter: { zone: ['A1'] } })).decision).toBe('allow');
    expect(w.ask(q({ filter: { zone: ['A1'] } })).decision).toBe('allow'); // identical
    expect(w.ask(q({ filter: { zone: ['A1'], ageBand: ['18-34', '35-44', '45-54', '55-64'] }, queryType: 'count_farmers' })).decision).toBe('allow'); // other category
    expect(w.ask(q({ filter: { zone: ['C1'] } })).decision).toBe('allow'); // disjoint
  });
});

describe('audit and purity', () => {
  it('records every query, allowed or refused, and keeps history only for released answers', () => {
    const w = world();
    w.ask(q({ filter: { zone: ['A3'] } }));
    w.ask(q({ filter: { zone: ['B1'] } }));
    w.ask(q({ purpose: 'nope' }));
    expect(w.state.audit.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(w.state.audit.map((e) => e.decision)).toEqual(['allow', 'refuse', 'refuse']);
    expect(w.state.history).toHaveLength(1);
    expect(w.state.audit.every((e) => Array.isArray(e.checks) && e.checks.length === 5)).toBe(true);
  });

  it('does not mutate its inputs', () => {
    const w = world();
    w.ask(q({ filter: { zone: ['A1'] } }));
    const before = JSON.stringify([w.state.ledger, w.state.history, w.ctx.dataset]);
    evaluateQuery(q({ filter: { zone: ['A1'], ageBand: ['18-34'] } }), { ...w.ctx, ledger: w.state.ledger, history: w.state.history, config: w.state.config });
    expect(JSON.stringify([w.state.ledger, w.state.history, w.ctx.dataset])).toBe(before);
  });

  it('is deterministic for the same inputs', () => {
    const a = world();
    const b = world();
    const request = q({ filter: { cooperative: ['fx-c'] } });
    expect(JSON.stringify(a.ask(request))).toBe(JSON.stringify(b.ask(request)));
  });

  it('covers every category and purpose with a consent cell in the fixture', () => {
    const { initialConsent } = buildFixture();
    const first = Object.values(initialConsent)[0];
    for (const c of DATA_CATEGORIES) for (const p of PURPOSES) expect(first[c.id][p.id]).toBe('cooperative');
  });
});
