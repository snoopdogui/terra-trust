// Evaluation harness. Runs each case on a fresh fixture, drives the same submitQuery path as the
// buyer portal, and compares every query's outcome with the case's expectation.
// Pure and deterministic: no randomness, no clock, no access to the live ledger or audit log.

import { buildFixture, selectFarmers } from './fixture.js';
import { CASES } from './cases.js';
import { describeFilter, purposeLabel, queryTypeLabel } from '../describe.js';
import {
  createTrustState,
  setConsent,
  setMinCohort,
  submitQuery,
  withdrawAllConsent,
} from '../trustState.js';

function pick(dataset, who, caseId) {
  const farmers = selectFarmers(dataset, who);
  if (farmers.length === 0) throw new Error(`Case ${caseId}: selector matched no fixture farmers`);
  return farmers;
}

export function describeQueryStep(request) {
  return `${request.buyerId}: ${queryTypeLabel(request.queryType)} for ${purposeLabel(request.purpose)}. ${describeFilter(request.filter)}${request.groupBy ? ', per cooperative' : ''}`;
}

export function runCase(testCase, { submit = submitQuery } = {}) {
  const fx = buildFixture();
  const ctx = { dataset: fx.dataset, buyers: fx.buyers };
  let state = createTrustState({ initialConsent: fx.initialConsent });
  const steps = [];

  testCase.steps.forEach((step, index) => {
    if (step.op === 'query') {
      const result = submit(state, ctx, step.request, index);
      state = result.state;
      const actual = { decision: result.entry.decision, code: result.entry.code };
      const pass = actual.decision === step.expect.decision && (!step.expect.code || actual.code === step.expect.code);
      steps.push({ index, kind: 'query', text: describeQueryStep(step.request), expected: step.expect, actual, pass });
    } else if (step.op === 'setConsent') {
      for (const f of pick(fx.dataset, step.who, testCase.id)) {
        state = setConsent(state, { farmerId: f.id, category: step.category, purpose: step.purpose, level: step.level });
      }
      steps.push({ index, kind: 'setup', text: step.note ?? 'Consent change.' });
    } else if (step.op === 'withdrawAll') {
      for (const f of pick(fx.dataset, step.who, testCase.id)) state = withdrawAllConsent(state, { farmerId: f.id });
      steps.push({ index, kind: 'setup', text: step.note ?? 'Consent withdrawn.' });
    } else if (step.op === 'setConfig') {
      state = setMinCohort(state, step.minCohort);
      steps.push({ index, kind: 'setup', text: step.note ?? 'Configuration changed.' });
    } else {
      throw new Error(`Case ${testCase.id}: unknown step "${step.op}"`);
    }
  });

  const allPass = steps.filter((s) => s.kind === 'query').every((s) => s.pass);
  let status;
  if (testCase.knownGap) status = allPass ? 'gap-closed' : 'known-gap';
  else status = allPass ? 'pass' : 'fail';

  return {
    id: testCase.id,
    category: testCase.category,
    title: testCase.title,
    attack: testCase.attack,
    why: testCase.why ?? null,
    control: Boolean(testCase.control),
    knownGap: Boolean(testCase.knownGap),
    status,
    steps,
  };
}

export function runEvaluation(cases = CASES, options = {}) {
  const results = cases.map((c) => runCase(c, options));
  const scored = results.filter((r) => !r.knownGap);
  const passed = scored.filter((r) => r.status === 'pass').length;
  const byCategory = {};
  for (const r of scored) {
    byCategory[r.category] ??= { passed: 0, total: 0 };
    byCategory[r.category].total += 1;
    if (r.status === 'pass') byCategory[r.category].passed += 1;
  }
  return {
    results,
    summary: {
      total: results.length,
      scored: scored.length,
      passed,
      failed: scored.length - passed,
      passRate: scored.length ? passed / scored.length : 0,
      knownGaps: results.filter((r) => r.status === 'known-gap').length,
      gapsClosed: results.filter((r) => r.status === 'gap-closed').length,
      byCategory,
    },
  };
}
