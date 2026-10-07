// Revenue split. Illustrative only: no real money moves and the percentages are not a recommendation.
//
// Money is held as integer pesewas (1 GHS = 100 pesewas). Splits use the largest-remainder method,
// so shares always add up to the fee exactly and nothing is lost to rounding.
//
// Each released query fee is split three ways: farmers, cooperative, trust.
//   farmers      shared equally among the farmers whose data counted toward that answer
//   cooperative  shared among their cooperatives in proportion to how many of their farmers counted
//   trust        kept by the trust entity

import { DEFAULT_SPLIT } from './constants.js';

export const SPLIT_KEYS = ['farmers', 'cooperative', 'trust'];

export function validateSplit(split) {
  if (!split || typeof split !== 'object') return 'The split is missing.';
  for (const key of SPLIT_KEYS) {
    if (!Number.isInteger(split[key]) || split[key] < 0) return `${key} must be a whole number of 0 or more.`;
  }
  const total = SPLIT_KEYS.reduce((n, k) => n + split[k], 0);
  return total === 100 ? null : `The three shares add up to ${total}%. They must add up to 100%.`;
}

/** Split an integer total in proportion to integer weights. Result sums to total exactly. */
export function splitAmount(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / sum);
  const shares = exact.map(Math.floor);
  let remainder = total - shares.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let n = 0; remainder > 0; n += 1, remainder -= 1) shares[order[n % order.length].i] += 1;
  return shares;
}

export function createRevenueState(split = DEFAULT_SPLIT) {
  return {
    split: { ...split },
    entries: [],
    totalFees: 0,
    trustBalance: 0,
    coopBalances: {},
    farmerBalances: {},
    farmerContributions: {},
  };
}

/** Change the split for future queries. Invalid splits are ignored and the state is returned unchanged. */
export function setSplit(state, split) {
  if (validateSplit(split)) return state;
  return { ...state, split: { farmers: split.farmers, cooperative: split.cooperative, trust: split.trust } };
}

/** contributors: [{ id, cooperativeId }] for the farmers whose data counted. */
export function recordRevenue(state, { queryId, at = null, feePesewas, contributors }) {
  if (!contributors.length || feePesewas <= 0) return state;
  const { farmers, cooperative, trust } = state.split;
  const [farmersPool, coopPool, trustPool] = splitAmount(feePesewas, [farmers, cooperative, trust]);

  const sorted = [...contributors].sort((a, b) => (a.id < b.id ? -1 : 1));
  const farmerShares = splitAmount(farmersPool, sorted.map(() => 1));
  const farmerBalances = { ...state.farmerBalances };
  const farmerContributions = { ...state.farmerContributions };
  sorted.forEach((c, i) => {
    farmerBalances[c.id] = (farmerBalances[c.id] || 0) + farmerShares[i];
    farmerContributions[c.id] = (farmerContributions[c.id] || 0) + 1;
  });

  const counts = new Map();
  for (const c of sorted) counts.set(c.cooperativeId, (counts.get(c.cooperativeId) || 0) + 1);
  const coopIds = [...counts.keys()].sort();
  const coopShares = splitAmount(coopPool, coopIds.map((id) => counts.get(id)));
  const coopBalances = { ...state.coopBalances };
  coopIds.forEach((id, i) => {
    coopBalances[id] = (coopBalances[id] || 0) + coopShares[i];
  });

  const entry = {
    queryId,
    at,
    feePesewas,
    split: { ...state.split },
    farmersPool,
    coopPool,
    trustPool,
    contributorCount: contributors.length,
  };
  return {
    ...state,
    entries: [...state.entries, entry],
    totalFees: state.totalFees + feePesewas,
    trustBalance: state.trustBalance + trustPool,
    coopBalances,
    farmerBalances,
    farmerContributions,
  };
}

export function revenueTotals(state) {
  const farmers = Object.values(state.farmerBalances).reduce((a, b) => a + b, 0);
  const cooperative = Object.values(state.coopBalances).reduce((a, b) => a + b, 0);
  return { total: state.totalFees, farmers, cooperative, trust: state.trustBalance };
}
