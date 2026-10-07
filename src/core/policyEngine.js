// Policy engine. A pure function: given a buyer's request and the current state, it either
// releases an aggregate or refuses and explains why. It reads state and never changes it.
//
// Checks run in a fixed order and stop at the first failure:
//   1 valid        the request is well formed and uses only allowed filters
//   2 purpose      the buyer is approved for the purpose, and the query type fits the purpose
//   3 consent      at least one farmer in the selection has consented for this purpose
//   4 cohort       every group has at least k consenting farmers (k is configurable)
//   5 differencing no earlier answer to this buyer differs by fewer than k farmers
//
// Refusal messages are deliberately coarse. They say "fewer than k" and never give exact counts
// or say which farmers declined, because that would itself leak information.

import {
  DEFAULT_MIN_COHORT,
  FILTER_DIMENSIONS,
  GROUP_BY_OPTIONS,
  HISTORY_WINDOW,
  LEVEL_RANK,
  MIN_COHORT_BOUNDS,
  PURPOSES,
  QUERY_TYPES,
  DATA_CATEGORIES,
} from './constants.js';
import { getLevel } from './consentLedger.js';
import { categoryKey, findDifferencingConflict } from './differencing.js';
import { aggregate } from './aggregation.js';
import { queryFee } from './pricing.js';

export const REASON = {
  OK: 'OK',
  INVALID_REQUEST: 'INVALID_REQUEST',
  PURPOSE_NOT_PERMITTED: 'PURPOSE_NOT_PERMITTED',
  NO_CONSENT: 'NO_CONSENT',
  COHORT_TOO_SMALL: 'COHORT_TOO_SMALL',
  DIFFERENCING_RISK: 'DIFFERENCING_RISK',
};

export const REASON_LABEL = {
  OK: 'Released',
  INVALID_REQUEST: 'Invalid request',
  PURPOSE_NOT_PERMITTED: 'Purpose not permitted',
  NO_CONSENT: 'Not consented',
  COHORT_TOO_SMALL: 'Group too small',
  DIFFERENCING_RISK: 'Differencing risk',
};

export const CHECKS = [
  { id: 'valid', label: 'Request is well formed' },
  { id: 'purpose', label: 'Purpose and query type are permitted' },
  { id: 'consent', label: 'Farmers have consented for this purpose' },
  { id: 'cohort', label: 'Enough consenting farmers in every group' },
  { id: 'differencing', label: 'No differencing risk against earlier answers' },
];

const FAILED_CHECK = {
  INVALID_REQUEST: 'valid',
  PURPOSE_NOT_PERMITTED: 'purpose',
  NO_CONSENT: 'consent',
  COHORT_TOO_SMALL: 'cohort',
  DIFFERENCING_RISK: 'differencing',
};

export function normalizeMinCohort(value) {
  const n = Number(value);
  if (!Number.isInteger(n)) return DEFAULT_MIN_COHORT;
  return Math.min(MIN_COHORT_BOUNDS.max, Math.max(MIN_COHORT_BOUNDS.min, n));
}

function buildChecks(code, detail) {
  const failedId = FAILED_CHECK[code];
  let failed = false;
  return CHECKS.map((check) => {
    if (code === REASON.OK) return { ...check, status: 'pass' };
    if (check.id === failedId) {
      failed = true;
      return { ...check, status: 'fail', detail };
    }
    return { ...check, status: failed ? 'skipped' : 'pass' };
  });
}

export function validateRequest(request, dataset) {
  if (!request || typeof request !== 'object') return 'The request is missing.';
  if (typeof request.buyerId !== 'string') return 'The buyer is missing.';
  if (!PURPOSES.some((p) => p.id === request.purpose)) return `Unknown purpose "${request.purpose}".`;
  if (!Object.hasOwn(QUERY_TYPES, request.queryType)) return `Unknown query type "${request.queryType}".`;
  const groupBy = request.groupBy ?? null;
  if (groupBy !== null && !GROUP_BY_OPTIONS.includes(groupBy)) {
    return `Results cannot be grouped by "${groupBy}". The only grouping allowed is by cooperative.`;
  }
  const filter = request.filter ?? {};
  if (typeof filter !== 'object' || Array.isArray(filter)) return 'The filter must be an object.';

  const validValues = {
    cooperative: dataset.cooperatives.map((c) => c.id),
    zone: dataset.zones.map((z) => z.id),
  };
  for (const [key, dim] of Object.entries(FILTER_DIMENSIONS)) if (dim.values) validValues[key] = dim.values;

  for (const [dim, values] of Object.entries(filter)) {
    if (!Object.hasOwn(FILTER_DIMENSIONS, dim)) {
      return `"${dim}" is not an allowed filter. Allowed filters: ${Object.keys(FILTER_DIMENSIONS).join(', ')}. Buyers cannot filter on identifiers.`;
    }
    if (!Array.isArray(values) || values.length === 0) return `The "${dim}" filter needs a non-empty list of values.`;
    const bad = values.find((v) => !validValues[dim].includes(v));
    if (bad !== undefined) return `"${bad}" is not a valid value for the "${dim}" filter.`;
  }
  return null;
}

export function selectPopulation(farmers, filter = {}) {
  const entries = Object.entries(filter);
  return farmers.filter((f) => entries.every(([dim, values]) => values.includes(f[FILTER_DIMENSIONS[dim].field])));
}

const purposeLabel = (id) => PURPOSES.find((p) => p.id === id).label;
const categoryLabels = (ids) => ids.map((id) => DATA_CATEGORIES.find((c) => c.id === id).label.toLowerCase()).join(' and ');
const joinLabels = (ids) => (ids.length ? ids.map(purposeLabel).join(', ') : 'none');

/**
 * ctx: { dataset, buyers, ledger, history, config }
 * Returns { decision, code, reason, checks, result, feePesewas, internal }.
 * `internal` holds cohort details for the trust's own bookkeeping. It must never be shown to buyers.
 */
export function evaluateQuery(request, ctx) {
  const { dataset, buyers, ledger, history = [], config = {} } = ctx;
  const k = normalizeMinCohort(config.minCohort);

  const refuse = (code, reason, cohortSize = null) => ({
    decision: 'refuse',
    code,
    reason,
    checks: buildChecks(code, reason),
    result: null,
    feePesewas: null,
    internal: { cohortSize, cohorts: [], contributors: [] },
  });

  const invalid = validateRequest(request, dataset);
  if (invalid) return refuse(REASON.INVALID_REQUEST, invalid);

  const buyer = buyers.find((b) => b.id === request.buyerId);
  if (!buyer) return refuse(REASON.INVALID_REQUEST, `Unknown buyer "${request.buyerId}".`);

  const queryType = QUERY_TYPES[request.queryType];
  if (!buyer.purposes.includes(request.purpose)) {
    return refuse(
      REASON.PURPOSE_NOT_PERMITTED,
      `${buyer.name} is not approved to use data for "${purposeLabel(request.purpose)}". Approved purposes: ${joinLabels(buyer.purposes)}.`,
    );
  }
  if (!queryType.purposes.includes(request.purpose)) {
    return refuse(
      REASON.PURPOSE_NOT_PERMITTED,
      `"${queryType.label}" is not permitted for the purpose "${purposeLabel(request.purpose)}". It can be used for: ${joinLabels(queryType.purposes)}.`,
    );
  }

  const filter = request.filter ?? {};
  const groupBy = request.groupBy ?? null;
  const population = selectPopulation(dataset.farmers, filter);
  const requiredRank = groupBy ? LEVEL_RANK.cooperative : LEVEL_RANK.aggregate;
  const contributes = (farmer) =>
    queryType.categories.every((category) => LEVEL_RANK[getLevel(ledger, farmer.id, category, request.purpose)] >= requiredRank);

  let groups;
  if (groupBy === 'cooperative') {
    groups = dataset.cooperatives
      .map((coop) => ({
        key: coop.id,
        label: coop.name,
        farmers: population.filter((f) => f.cooperativeId === coop.id).filter(contributes),
        present: population.some((f) => f.cooperativeId === coop.id),
      }))
      .filter((g) => g.present);
  } else {
    groups = [{ key: 'all', label: 'All selected farmers', farmers: population.filter(contributes) }];
  }

  const total = groups.reduce((n, g) => n + g.farmers.length, 0);
  if (total === 0) {
    const level = groupBy ? ', including per-cooperative results' : '';
    return refuse(
      REASON.NO_CONSENT,
      `No farmers in this selection have consented to share ${categoryLabels(queryType.categories)} for "${purposeLabel(request.purpose)}" (aggregate results only${level}).`,
      0,
    );
  }

  if (groups.some((g) => g.farmers.length < k)) {
    const reason = groupBy
      ? `At least one cooperative group would have fewer than ${k} consenting farmers. The minimum group size is ${k}. Remove the grouping or widen the selection.`
      : `Fewer than ${k} consenting farmers would contribute to this result. The minimum group size is ${k}. Widen the selection by removing filters or adding more groups.`;
    return refuse(REASON.COHORT_TOO_SMALL, reason, total);
  }

  const cohorts = groups.map((g) => ({ label: g.key, ids: g.farmers.map((f) => f.id) }));
  const conflict = findDifferencingConflict(cohorts, history, {
    buyerId: request.buyerId,
    key: categoryKey(request.queryType),
    k,
    windowSize: HISTORY_WINDOW,
  });
  if (conflict) {
    return refuse(
      REASON.DIFFERENCING_RISK,
      `This result would differ from your earlier query #${conflict.queryId} by fewer than ${k} farmers. Comparing the two could reveal information about individual farmers. Use a selection that differs from that query by at least ${k} farmers.`,
      total,
    );
  }

  return {
    decision: 'allow',
    code: REASON.OK,
    reason: 'All checks passed. An aggregate result was released.',
    checks: buildChecks(REASON.OK),
    result: aggregate(request.queryType, groups.map((g) => ({ label: g.label, farmers: g.farmers }))),
    feePesewas: queryFee(request.queryType, groupBy),
    internal: {
      cohortSize: total,
      cohorts,
      contributors: groups.flatMap((g) => g.farmers.map((f) => ({ id: f.id, cooperativeId: f.cooperativeId }))),
    },
  };
}
