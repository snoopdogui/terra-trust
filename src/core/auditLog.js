// Filtering and summarising the audit log. Pure functions over audit entries.
import { describeFilter, purposeLabel, queryTypeLabel } from './describe.js';

export const EMPTY_CRITERIA = { decision: 'all', code: 'all', buyerId: 'all', purpose: 'all', text: '' };

function haystack(entry, nameFor) {
  return [
    entry.reason,
    describeFilter(entry.filter, nameFor),
    queryTypeLabel(entry.queryType),
    purposeLabel(entry.purpose),
    entry.buyerId,
    String(entry.id),
  ]
    .join(' ')
    .toLowerCase();
}

/** Newest first. Every criterion that is "all" or empty is ignored. */
export function filterAudit(entries, criteria = EMPTY_CRITERIA, nameFor = (dim, v) => v) {
  const c = { ...EMPTY_CRITERIA, ...criteria };
  const text = c.text.trim().toLowerCase();
  return entries
    .filter((e) => c.decision === 'all' || e.decision === c.decision)
    .filter((e) => c.code === 'all' || e.code === c.code)
    .filter((e) => c.buyerId === 'all' || e.buyerId === c.buyerId)
    .filter((e) => c.purpose === 'all' || e.purpose === c.purpose)
    .filter((e) => !text || haystack(e, nameFor).includes(text))
    .slice()
    .reverse();
}

export function summariseAudit(entries) {
  const byCode = {};
  for (const e of entries) byCode[e.code] = (byCode[e.code] || 0) + 1;
  const released = entries.filter((e) => e.decision === 'allow').length;
  return { total: entries.length, released, refused: entries.length - released, byCode };
}
