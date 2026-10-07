// A small hand-built dataset used by the policy-engine tests and the evaluation harness.
//
// Why not the live synthetic dataset? Adversarial cases need exact cohort sizes (9 versus 10,
// one unique person, a group where everyone has the same value). Building the fixture by
// arithmetic, not by random draws, makes every expected outcome deterministic and independent of
// the generator. Everything here is invented.

import { AGE_BANDS, DATA_CATEGORIES, PLOT_BANDS, PURPOSES, VARIETIES } from '../constants.js';

export const FIXTURE_ZONES = [
  { cooperativeId: 'fx-a', id: 'A1', size: 30 }, // contains exactly one farmer aged 65+
  { cooperativeId: 'fx-a', id: 'A2', size: 12 },
  { cooperativeId: 'fx-a', id: 'A3', size: 10 }, // exactly the default minimum
  { cooperativeId: 'fx-b', id: 'B1', size: 9 }, // one below the default minimum
  { cooperativeId: 'fx-b', id: 'B2', size: 20 },
  { cooperativeId: 'fx-c', id: 'C1', size: 25 },
  { cooperativeId: 'fx-c', id: 'H1', size: 10, homogeneous: true }, // everyone has the same yield
  { cooperativeId: 'fx-d', id: 'D1', size: 4 },
];

const BASE_AGE_BANDS = AGE_BANDS.slice(0, 4); // everything except 65+

export function buildFixture() {
  const farmers = [];
  FIXTURE_ZONES.forEach((zone, zoneIndex) => {
    for (let i = 0; i < zone.size; i += 1) {
      const ageBand = zone.id === 'A1' && i === 0 ? AGE_BANDS[4] : BASE_AGE_BANDS[i % 4];
      farmers.push({
        id: `FX-${zone.id}-${String(i).padStart(2, '0')}`,
        cooperativeId: zone.cooperativeId,
        zoneId: zone.id,
        ageBand,
        gender: i % 2 === 0 ? 'F' : 'M',
        plotSizeBand: PLOT_BANDS[i % 4],
        variety: VARIETIES[(i + 1) % 4],
        yieldKgHa: zone.homogeneous ? 500 : 400 + ((i * 37 + zoneIndex * 11) % 160),
        priceGhsPerKg: Math.round((20 + ((i * 7) % 10) / 2) * 100) / 100,
      });
    }
  });

  const coopIds = [...new Set(FIXTURE_ZONES.map((z) => z.cooperativeId))];
  const cooperatives = coopIds.map((id) => ({
    id,
    name: `Fixture Cooperative ${id.slice(-1).toUpperCase()}`,
    zones: FIXTURE_ZONES.filter((z) => z.cooperativeId === id).map((z) => z.id),
    farmerCount: farmers.filter((f) => f.cooperativeId === id).length,
  }));
  const zones = FIXTURE_ZONES.map((z) => ({ id: z.id, cooperativeId: z.cooperativeId }));

  // Everyone starts with the most permissive consent. Cases then narrow it as they need.
  const initialConsent = {};
  for (const f of farmers) {
    initialConsent[f.id] = {};
    for (const c of DATA_CATEGORIES) {
      initialConsent[f.id][c.id] = {};
      for (const p of PURPOSES) initialConsent[f.id][c.id][p.id] = 'cooperative';
    }
  }

  const allPurposes = PURPOSES.map((p) => p.id);
  const buyers = [
    { id: 'buyer-1', name: 'Fixture Buyer 1', kind: 'test', purposes: allPurposes },
    { id: 'buyer-2', name: 'Fixture Buyer 2', kind: 'test', purposes: allPurposes },
    { id: 'buyer-3', name: 'Fixture Buyer 3', kind: 'test', purposes: ['price_benchmarking'] },
  ];

  return {
    dataset: { meta: { name: 'Evaluation fixture', synthetic: true }, cooperatives, zones, farmers, initialConsent },
    initialConsent,
    buyers,
  };
}

/** Pick fixture farmers by zone (and optionally one by index, or the first `count`). */
export function selectFarmers(dataset, { zone, cooperative, index, count } = {}) {
  let list = dataset.farmers;
  if (zone) list = list.filter((f) => f.zoneId === zone);
  if (cooperative) list = list.filter((f) => f.cooperativeId === cooperative);
  if (typeof index === 'number') return list.slice(index, index + 1);
  if (typeof count === 'number') return list.slice(0, count);
  return list;
}
