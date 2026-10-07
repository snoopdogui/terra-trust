// Synthetic dataset generator. Everything it produces is invented.
// A seeded generator means the same seed always yields the same dataset.
//
// Design notes (also written up in the README and the data card):
// - Cooperatives, zones and farmers are fictional. Names are neutral letters.
// - Exact age and exact plot size are generated, used to derive bands, then discarded.
// - Yield and price are not calibrated to any real market or survey.
// - Consent profiles are assigned by the generator, not by real people.

import { createRng, clamp } from './rng.js';
import {
  AGE_BANDS,
  DATA_CATEGORIES,
  DEFAULT_SEED,
  GENDERS,
  GENERATOR_VERSION,
  PLOT_BANDS,
  PURPOSES,
  VARIETIES,
} from './constants.js';

export const COOPERATIVE_SPECS = [
  { id: 'coop-a', name: 'Cooperative A', size: 28, zones: 2, yieldMean: 430, priceMean: 27.0 },
  { id: 'coop-b', name: 'Cooperative B', size: 36, zones: 3, yieldMean: 470, priceMean: 28.0 },
  { id: 'coop-c', name: 'Cooperative C', size: 44, zones: 3, yieldMean: 510, priceMean: 29.0 },
  { id: 'coop-d', name: 'Cooperative D', size: 52, zones: 3, yieldMean: 450, priceMean: 27.5 },
  { id: 'coop-e', name: 'Cooperative E', size: 62, zones: 4, yieldMean: 490, priceMean: 28.5 },
  { id: 'coop-f', name: 'Cooperative F', size: 78, zones: 4, yieldMean: 530, priceMean: 30.0 },
];

const ZONE_WEIGHTS = { 2: [0.65, 0.35], 3: [0.5, 0.3, 0.2], 4: [0.4, 0.3, 0.2, 0.1] };

export const CONSENT_PROFILES = ['broad', 'selective', 'cautious', 'withheld'];
const PROFILE_WEIGHTS = [0.3, 0.4, 0.22, 0.08];
// Probability of [none, aggregate, cooperative] for each cell, by profile.
const LEVEL_WEIGHTS = {
  broad: [0.05, 0.45, 0.5],
  selective: [0.35, 0.45, 0.2],
  cautious: [0.65, 0.3, 0.05],
  withheld: [1, 0, 0],
};
const LEVELS = ['none', 'aggregate', 'cooperative'];

export function plotBand(hectares) {
  if (hectares < 1) return PLOT_BANDS[0];
  if (hectares < 2) return PLOT_BANDS[1];
  if (hectares <= 3) return PLOT_BANDS[2];
  return PLOT_BANDS[3];
}

function generateConsent(rng, profile) {
  const consent = {};
  for (const category of DATA_CATEGORIES) {
    consent[category.id] = {};
    for (const purpose of PURPOSES) {
      let idx = LEVELS.indexOf(rng.weighted(LEVELS, LEVEL_WEIGHTS[profile]));
      // Plot location is the most sensitive category, so people step down more often.
      if (category.id === 'plot_location' && idx > 0 && rng.chance(0.3)) idx -= 1;
      consent[category.id][purpose.id] = LEVELS[idx];
    }
  }
  return consent;
}

export function generateDataset(seed = DEFAULT_SEED) {
  const rng = createRng(seed);
  const cooperatives = [];
  const zones = [];
  const farmers = [];
  const initialConsent = {};
  const consentProfiles = {};
  let counter = 1;

  for (const spec of COOPERATIVE_SPECS) {
    const letter = spec.id.slice(-1).toUpperCase();
    const zoneIds = Array.from({ length: spec.zones }, (_, i) => `${letter}${i + 1}`);
    zoneIds.forEach((id) => zones.push({ id, cooperativeId: spec.id }));
    const weights = ZONE_WEIGHTS[spec.zones];

    for (let i = 0; i < spec.size; i += 1) {
      const id = `SYN-${String(counter).padStart(4, '0')}`;
      counter += 1;
      const zoneId = rng.weighted(zoneIds, weights);
      const ageBand = rng.weighted(AGE_BANDS, [0.2, 0.28, 0.26, 0.18, 0.08]);
      const gender = rng.chance(0.4) ? GENDERS[0] : GENDERS[1];
      const hectares = clamp(Math.round(rng.normal(2.0, 1.0) * 10) / 10, 0.4, 6.0);
      const variety = rng.weighted(VARIETIES, [0.3, 0.25, 0.2, 0.25]);
      const yieldKgHa = Math.round(
        clamp(spec.yieldMean + (hectares - 2) * 15 + rng.normal(0, 85), 150, 1100),
      );
      const priceGhsPerKg = Math.round(clamp(spec.priceMean + rng.normal(0, 1.8), 15, 45) * 100) / 100;
      const profile = rng.weighted(CONSENT_PROFILES, PROFILE_WEIGHTS);

      farmers.push({
        id,
        cooperativeId: spec.id,
        zoneId,
        ageBand,
        gender,
        plotSizeBand: plotBand(hectares), // exact hectares are discarded
        variety,
        yieldKgHa,
        priceGhsPerKg,
      });
      initialConsent[id] = generateConsent(rng, profile);
      consentProfiles[id] = profile;
    }
    cooperatives.push({ id: spec.id, name: spec.name, zones: zoneIds, farmerCount: spec.size });
  }

  return {
    meta: {
      name: 'Terra Trust synthetic farmer dataset',
      synthetic: true,
      seed,
      generatorVersion: GENERATOR_VERSION,
      referenceSeason: 'One synthetic reference season',
      farmerCount: farmers.length,
      cooperativeCount: cooperatives.length,
    },
    cooperatives,
    zones,
    farmers,
    initialConsent,
    consentProfiles,
  };
}
