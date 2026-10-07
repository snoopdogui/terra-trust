// CSV export of the synthetic farmer table. One flat table, one row per farmer.
// Consent settings are not included: they change as farmers change them, and the card describes them.
import { FARMER_COLUMNS } from './datasetStats.js';

export const CSV_FILE_NAME = 'terra-trust-synthetic-farmers.csv';

function cell(value) {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function datasetToCsv(dataset) {
  const names = FARMER_COLUMNS.map((c) => c.name);
  const lines = [names.join(',')];
  for (const f of dataset.farmers) lines.push(names.map((n) => cell(f[n])).join(','));
  return `${lines.join('\n')}\n`;
}
