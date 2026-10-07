// Validation and descriptive statistics for a dataset. Pure functions.
// The same numbers feed the Dataset view, the data card and the readiness scorecard.

import {
  AGE_BANDS,
  DATA_CATEGORIES,
  GENDERS,
  PLOT_BANDS,
  PURPOSES,
  VARIETIES,
} from './constants.js';

export const FARMER_COLUMNS = [
  { name: 'id', description: 'Synthetic farmer identifier. Not linked to any real person.', dataType: 'text' },
  { name: 'cooperativeId', description: 'Synthetic cooperative the farmer belongs to.', dataType: 'text' },
  { name: 'zoneId', description: 'Coarse synthetic zone within the cooperative. Stands in for coarse plot location.', dataType: 'text' },
  { name: 'ageBand', description: 'Age band of the farmer (exact age is not stored).', dataType: 'text' },
  { name: 'gender', description: 'F or M, as generated.', dataType: 'text' },
  { name: 'plotSizeBand', description: 'Plot size band in hectares (exact size is not stored).', dataType: 'text' },
  { name: 'variety', description: 'Cocoa variety group.', dataType: 'text' },
  { name: 'yieldKgHa', description: 'Dry cocoa yield in kilograms per hectare for one synthetic reference season.', dataType: 'number', unit: 'kg/ha' },
  { name: 'priceGhsPerKg', description: 'Price received in Ghanaian cedi per kilogram, synthetic and not calibrated to any market.', dataType: 'number', unit: 'GHS/kg' },
];

export function validateDataset(ds) {
  const problems = [];
  const coopIds = new Set(ds.cooperatives.map((c) => c.id));
  const zoneToCoop = new Map(ds.zones.map((z) => [z.id, z.cooperativeId]));
  const seen = new Set();
  const levels = new Set(['none', 'aggregate', 'cooperative']);

  for (const f of ds.farmers) {
    if (seen.has(f.id)) problems.push(`duplicate id ${f.id}`);
    seen.add(f.id);
    if (!coopIds.has(f.cooperativeId)) problems.push(`${f.id}: unknown cooperative`);
    if (zoneToCoop.get(f.zoneId) !== f.cooperativeId) problems.push(`${f.id}: zone not in cooperative`);
    if (!AGE_BANDS.includes(f.ageBand)) problems.push(`${f.id}: bad ageBand`);
    if (!GENDERS.includes(f.gender)) problems.push(`${f.id}: bad gender`);
    if (!PLOT_BANDS.includes(f.plotSizeBand)) problems.push(`${f.id}: bad plotSizeBand`);
    if (!VARIETIES.includes(f.variety)) problems.push(`${f.id}: bad variety`);
    if (!Number.isFinite(f.yieldKgHa)) problems.push(`${f.id}: bad yield`);
    if (!Number.isFinite(f.priceGhsPerKg)) problems.push(`${f.id}: bad price`);
    const consent = ds.initialConsent[f.id];
    if (!consent) {
      problems.push(`${f.id}: missing consent profile`);
      continue;
    }
    for (const c of DATA_CATEGORIES) {
      for (const p of PURPOSES) {
        if (!levels.has(consent[c.id]?.[p.id])) problems.push(`${f.id}: bad consent ${c.id}/${p.id}`);
      }
    }
  }
  return problems;
}

function numeric(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return {
    mean: Math.round(mean * 100) / 100,
    sd: Math.round(Math.sqrt(variance) * 100) / 100,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function summariseDataset(ds) {
  const n = ds.farmers.length;
  const perCooperative = ds.cooperatives.map((c) => {
    const members = ds.farmers.filter((f) => f.cooperativeId === c.id);
    return {
      id: c.id,
      name: c.name,
      farmers: members.length,
      share: members.length / n,
      zones: c.zones.length,
      meanYield: Math.round((members.reduce((a, f) => a + f.yieldKgHa, 0) / members.length) * 10) / 10,
      meanPrice: Math.round((members.reduce((a, f) => a + f.priceGhsPerKg, 0) / members.length) * 100) / 100,
    };
  });
  const zoneSizes = ds.zones.map((z) => ({
    id: z.id,
    cooperativeId: z.cooperativeId,
    farmers: ds.farmers.filter((f) => f.zoneId === z.id).length,
  }));
  const profileCounts = {};
  for (const p of Object.values(ds.consentProfiles)) profileCounts[p] = (profileCounts[p] || 0) + 1;

  const consentCells = [];
  for (const c of DATA_CATEGORIES) {
    for (const p of PURPOSES) {
      const counts = { none: 0, aggregate: 0, cooperative: 0 };
      for (const f of ds.farmers) counts[ds.initialConsent[f.id][c.id][p.id]] += 1;
      consentCells.push({ category: c.id, purpose: p.id, ...counts });
    }
  }
  const sizes = zoneSizes.map((z) => z.farmers);
  return {
    rows: n,
    columns: FARMER_COLUMNS.length,
    cooperatives: ds.cooperatives.length,
    zones: ds.zones.length,
    perCooperative,
    zoneSizes,
    smallestZone: Math.min(...sizes),
    largestZone: Math.max(...sizes),
    yield: numeric(ds.farmers.map((f) => f.yieldKgHa)),
    price: numeric(ds.farmers.map((f) => f.priceGhsPerKg)),
    profileCounts,
    consentCells,
  };
}
