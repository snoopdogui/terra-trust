// Plain-language descriptions of requests, shared by the portal, the audit log and the evaluation view.
import { FILTER_DIMENSIONS, PURPOSES, QUERY_TYPES } from './constants.js';

export const purposeLabel = (id) => PURPOSES.find((p) => p.id === id)?.label ?? String(id);
export const queryTypeLabel = (id) => QUERY_TYPES[id]?.label ?? String(id);

export function describeFilter(filter, nameFor = (dim, value) => value) {
  const parts = Object.entries(filter || {})
    .filter(([, values]) => Array.isArray(values) && values.length)
    .map(([dim, values]) => `${FILTER_DIMENSIONS[dim]?.label ?? dim}: ${values.map((v) => nameFor(dim, v)).join(', ')}`);
  return parts.length ? parts.join('; ') : 'No filters (all farmers)';
}
