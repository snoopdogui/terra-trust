// The trust's whole mutable state in one plain object, so it can be saved, reset and tested.
// The UI store and the evaluation harness both drive it through these functions, so the harness
// exercises exactly the code path the buyer portal uses.

import { DEFAULT_MIN_COHORT, HISTORY_CAP } from './constants.js';
import { createLedger, setConsent as ledgerSetConsent, withdrawAll as ledgerWithdrawAll } from './consentLedger.js';
import { categoryKey } from './differencing.js';
import { evaluateQuery, normalizeMinCohort } from './policyEngine.js';
import { createRevenueState, recordRevenue, setSplit } from './revenue.js';

export const TRUST_STATE_VERSION = 3;
export const AUDIT_CAP = 2000; // keeps localStorage small; the README notes the cap

export function createTrustState({ initialConsent, seed = null, config = {} }) {
  return {
    version: TRUST_STATE_VERSION,
    seed,
    config: { minCohort: normalizeMinCohort(config.minCohort ?? DEFAULT_MIN_COHORT) },
    ledger: createLedger(initialConsent),
    history: [], // internal: cohorts behind each released answer, used by the differencing guard
    audit: [], // one entry per query, whatever the outcome
    revenue: createRevenueState(),
    nextId: 1,
  };
}

export function setConsent(state, change) {
  const ledger = ledgerSetConsent(state.ledger, change);
  return ledger === state.ledger ? state : { ...state, ledger };
}

export function withdrawAllConsent(state, args) {
  const ledger = ledgerWithdrawAll(state.ledger, args);
  return ledger === state.ledger ? state : { ...state, ledger };
}

export function setMinCohort(state, k) {
  return { ...state, config: { ...state.config, minCohort: normalizeMinCohort(k) } };
}

/** Change the revenue split for future queries. Invalid splits leave the state unchanged. */
export function setRevenueSplit(state, split) {
  const revenue = setSplit(state.revenue, split);
  return revenue === state.revenue ? state : { ...state, revenue };
}

/**
 * Run one query through the policy engine and record it.
 * ctx: { dataset, buyers }. Returns { state, entry, outcome }.
 * `outcome.internal` is for the trust only and is never stored in the audit entry beyond cohortSize.
 */
export function submitQuery(state, ctx, request, at = null) {
  const outcome = evaluateQuery(request, {
    dataset: ctx.dataset,
    buyers: ctx.buyers,
    ledger: state.ledger,
    history: state.history,
    config: state.config,
  });
  const id = state.nextId;
  const filter = request && request.filter && typeof request.filter === 'object' && !Array.isArray(request.filter) ? request.filter : {};

  const entry = {
    id,
    at,
    buyerId: request?.buyerId ?? null,
    purpose: request?.purpose ?? null,
    queryType: request?.queryType ?? null,
    groupBy: request?.groupBy ?? null,
    filter,
    minCohort: state.config.minCohort,
    decision: outcome.decision,
    code: outcome.code,
    reason: outcome.reason,
    checks: outcome.checks,
    result: outcome.result,
    feePesewas: outcome.feePesewas,
    cohortSize: outcome.internal.cohortSize, // visible to cooperative and trust staff only
  };

  let history = state.history;
  if (outcome.decision === 'allow') {
    history = [
      ...history,
      { queryId: id, buyerId: request.buyerId, categoryKey: categoryKey(request.queryType), cohorts: outcome.internal.cohorts },
    ].slice(-HISTORY_CAP);
  }

  let revenue = state.revenue;
  if (outcome.decision === 'allow') {
    revenue = recordRevenue(revenue, {
      queryId: id,
      at,
      feePesewas: outcome.feePesewas,
      contributors: outcome.internal.contributors,
    });
  }

  const next = { ...state, history, revenue, audit: [...state.audit, entry].slice(-AUDIT_CAP), nextId: id + 1 };
  return { state: next, entry, outcome };
}

/** Light shape check used when loading saved state. */
export function isUsableTrustState(state, { seed, farmerCount }) {
  return Boolean(
    state &&
      state.version === TRUST_STATE_VERSION &&
      state.seed === seed &&
      state.ledger &&
      state.ledger.effective &&
      Array.isArray(state.audit) &&
      Array.isArray(state.history) &&
      state.revenue &&
      state.revenue.split &&
      Object.keys(state.ledger.effective).length === farmerCount,
  );
}
