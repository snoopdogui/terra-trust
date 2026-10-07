import { GROUP_BY_FEE_MULTIPLIER, QUERY_TYPES } from './constants.js';

/** Fee for one answered query, in integer pesewas. Illustrative figures, not market prices. */
export function queryFee(queryType, groupBy = null) {
  const base = QUERY_TYPES[queryType].feePesewas;
  return groupBy ? base * GROUP_BY_FEE_MULTIPLIER : base;
}
