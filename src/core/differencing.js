// Differencing guard.
//
// The attack: ask for an average over a group, then ask again over almost the same group with one
// person left out (or added). Subtracting the two answers reveals that person's value.
//
// The guard: for the same kind of data, refuse a new answer if its set of contributing farmers
// differs from the set behind any earlier answer to the same buyer by more than zero but fewer
// than k farmers. Identical sets are allowed (a repeat reveals nothing new). Sets that differ by
// k or more are allowed.
//
// This is a heuristic. It checks pairs of answers. It does not defend against combinations of many
// queries, against several buyers pooling answers, or against groups whose members all share the
// same value. See the threat model.

import { QUERY_TYPES } from './constants.js';

/** Queries about the same data categories can be differenced against each other. */
export function categoryKey(queryType) {
  return [...QUERY_TYPES[queryType].categories].sort().join('+');
}

export function symmetricDifferenceSize(idsA, idsB) {
  const a = new Set(idsA);
  const b = new Set(idsB);
  let diff = 0;
  for (const id of b) if (!a.has(id)) diff += 1;
  for (const id of a) if (!b.has(id)) diff += 1;
  return diff;
}

/**
 * Compare new cohorts against this buyer's earlier answers.
 * Returns { queryId, diffSize, label } for the first conflict, or null.
 */
export function findDifferencingConflict(cohorts, history, { buyerId, key, k, windowSize }) {
  const relevant = history.filter((h) => h.buyerId === buyerId && h.categoryKey === key).slice(-windowSize);
  for (const cohort of cohorts) {
    for (const prior of relevant) {
      for (const earlier of prior.cohorts) {
        const diffSize = symmetricDifferenceSize(cohort.ids, earlier.ids);
        if (diffSize > 0 && diffSize < k) return { queryId: prior.queryId, diffSize, label: cohort.label };
      }
    }
  }
  return null;
}
