// The live dataset is generated once, at load, from the fixed seed. It is not stored:
// regenerating gives the same result, so only consent and audit state need persisting.
import { generateDataset } from '../core/syntheticData.js';
import { summariseDataset } from '../core/datasetStats.js';

export const DATASET = generateDataset();
export const SUMMARY = summariseDataset(DATASET);
export const COOP_NAME = Object.fromEntries(DATASET.cooperatives.map((c) => [c.id, c.name]));
export const FARMER_BY_ID = Object.fromEntries(DATASET.farmers.map((f) => [f.id, f]));
