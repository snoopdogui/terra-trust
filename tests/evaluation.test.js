import { describe, expect, it } from 'vitest';
import { CASES, CATEGORIES } from '../src/core/evaluation/cases.js';
import { runCase, runEvaluation } from '../src/core/evaluation/runner.js';
import { submitQuery } from '../src/core/trustState.js';
import { THREAT_MODEL } from '../src/core/threatModel.js';

const scored = CASES.filter((c) => !c.knownGap);
const gaps = CASES.filter((c) => c.knownGap);

// The same cases the "Run evaluation" screen shows, run here as unit tests against the policy engine.
describe('adversarial cases: scored', () => {
  it.each(scored.map((c) => [c.id, c.title, c]))('%s %s', (_id, _title, testCase) => {
    const result = runCase(testCase);
    const failures = result.steps.filter((s) => s.kind === 'query' && !s.pass);
    expect(failures.map((s) => `${s.text} expected ${JSON.stringify(s.expected)} got ${JSON.stringify(s.actual)}`)).toEqual([]);
    expect(result.status).toBe('pass');
  });
});

describe('adversarial cases: documented gaps', () => {
  // These attacks are NOT stopped. If one starts passing, update the README and the threat model.
  it.each(gaps.map((c) => [c.id, c.title, c]))('%s %s is still a known gap', (_id, _title, testCase) => {
    expect(runCase(testCase).status).toBe('known-gap');
  });
});

describe('evaluation set', () => {
  it('has 20 to 30 cases with unique ids and at least one expectation per scored case', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(20);
    expect(CASES.length).toBeLessThanOrEqual(30);
    expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length);
    for (const c of scored) expect(c.steps.some((s) => s.op === 'query' && s.expect)).toBe(true);
  });

  it('covers the five required attack families and uses only known categories', () => {
    const present = new Set(CASES.map((c) => c.category));
    for (const family of ['re-identification', 'small cohort', 'differencing', 'purpose and consent', 'consent withdrawal']) {
      expect(present.has(family)).toBe(true);
    }
    for (const c of CASES) expect(CATEGORIES).toContain(c.category);
  });

  it('reports a 100% pass rate on scored cases and keeps gaps out of it', () => {
    const { summary } = runEvaluation();
    expect(summary.scored).toBe(scored.length);
    expect(summary.passed).toBe(scored.length);
    expect(summary.passRate).toBe(1);
    expect(summary.knownGaps).toBe(gaps.length);
    expect(summary.gapsClosed).toBe(0);
  });

  it('is deterministic and independent of case order', () => {
    const a = runEvaluation(CASES);
    const b = runEvaluation(CASES);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const reversed = runEvaluation([...CASES].reverse());
    const status = (r) => Object.fromEntries(r.results.map((x) => [x.id, x.status]));
    expect(status(reversed)).toEqual(status(a));
  });
});

describe('the harness can fail', () => {
  it('reports a failure when an expectation is wrong', () => {
    const wrong = { id: 'X', category: 'small cohort', title: 'wrong', attack: '', steps: [{ op: 'query', request: { buyerId: 'buyer-1', purpose: 'supply_chain_planning', queryType: 'mean_yield', filter: { zone: ['B1'] }, groupBy: null }, expect: { decision: 'allow' } }] };
    expect(runCase(wrong).status).toBe('fail');
  });

  it('detects a regression: with differencing history disabled, differencing and withdrawal cases fail', () => {
    const broken = (state, ctx, request, at) => submitQuery({ ...state, history: [] }, ctx, request, at);
    const { results } = runEvaluation(CASES, { submit: broken });
    const failed = results.filter((r) => r.status === 'fail').map((r) => r.id);
    for (const id of ['DF-01', 'DF-02', 'DF-03', 'CW-01', 'CW-05']) expect(failed).toContain(id);
    expect(failed).not.toContain('SC-01');
  });

  it('detects a regression: with the minimum cohort bypassed, small-cohort cases fail', () => {
    const lax = (state, ctx, request, at) => submitQuery({ ...state, config: { minCohort: 2 } }, ctx, request, at);
    const { results } = runEvaluation(CASES, { submit: lax });
    const failed = results.filter((r) => r.status === 'fail').map((r) => r.id);
    expect(failed).toContain('SC-01');
    expect(failed).toContain('CW-02');
  });

  it('rejects a case whose farmer selector matches nobody', () => {
    const bad = { id: 'Y', category: 'small cohort', title: 'bad', attack: '', steps: [{ op: 'withdrawAll', who: { zone: 'NOPE' } }] };
    expect(() => runCase(bad)).toThrow(/matched no fixture farmers/);
  });
});

describe('threat model', () => {
  it('names adversaries, assumptions and what is out of scope, and mentions both known gaps', () => {
    expect(THREAT_MODEL.adversaries.length).toBeGreaterThanOrEqual(3);
    expect(THREAT_MODEL.assumptions.length).toBeGreaterThan(0);
    const out = THREAT_MODEL.outOfScope.join(' ').toLowerCase();
    expect(out).toContain('homogeneous');
    expect(out).toContain('colluding');
  });
});
