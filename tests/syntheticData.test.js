import { describe, expect, it } from 'vitest';
import { COOPERATIVE_SPECS, generateDataset } from '../src/core/syntheticData.js';
import { summariseDataset, validateDataset } from '../src/core/datasetStats.js';
import { DATA_CATEGORIES, DEFAULT_SEED, FARMER_COUNT, PURPOSES } from '../src/core/constants.js';

const ds = generateDataset(DEFAULT_SEED);

describe('synthetic dataset', () => {
  it('is reproducible for the same seed', () => {
    expect(JSON.stringify(generateDataset(DEFAULT_SEED))).toBe(JSON.stringify(ds));
  });

  it('changes when the seed changes', () => {
    expect(JSON.stringify(generateDataset(DEFAULT_SEED + 1))).not.toBe(JSON.stringify(ds));
  });

  it('has 300 farmers across 6 cooperatives with the specified sizes', () => {
    expect(ds.farmers).toHaveLength(FARMER_COUNT);
    expect(ds.cooperatives).toHaveLength(6);
    for (const spec of COOPERATIVE_SPECS) {
      expect(ds.farmers.filter((f) => f.cooperativeId === spec.id)).toHaveLength(spec.size);
    }
  });

  it('passes structural validation', () => {
    expect(validateDataset(ds)).toEqual([]);
  });

  it('uses only fictional labels and carries no direct identifiers', () => {
    for (const c of ds.cooperatives) expect(c.name).toMatch(/^Cooperative [A-F]$/);
    for (const f of ds.farmers) {
      expect(f.id).toMatch(/^SYN-\d{4}$/);
      expect(Object.keys(f).sort()).toEqual(
        ['ageBand', 'cooperativeId', 'gender', 'id', 'plotSizeBand', 'priceGhsPerKg', 'variety', 'yieldKgHa', 'zoneId'].sort(),
      );
    }
    expect(ds.meta.synthetic).toBe(true);
  });

  it('keeps yield and price in the generator ranges', () => {
    for (const f of ds.farmers) {
      expect(f.yieldKgHa).toBeGreaterThanOrEqual(150);
      expect(f.yieldKgHa).toBeLessThanOrEqual(1100);
      expect(f.priceGhsPerKg).toBeGreaterThanOrEqual(15);
      expect(f.priceGhsPerKg).toBeLessThanOrEqual(45);
    }
  });

  it('gives every farmer a consent level for every category and purpose', () => {
    for (const f of ds.farmers) {
      for (const c of DATA_CATEGORIES) {
        for (const p of PURPOSES) {
          expect(['none', 'aggregate', 'cooperative']).toContain(ds.initialConsent[f.id][c.id][p.id]);
        }
      }
    }
  });

  it('mixes consent profiles so that policy checks have something to do', () => {
    const summary = summariseDataset(ds);
    expect(Object.keys(summary.profileCounts).length).toBeGreaterThanOrEqual(3);
    const withNone = summary.consentCells.filter((c) => c.none > 0).length;
    expect(withNone).toBe(summary.consentCells.length);
  });

  it('contains at least one zone below the default minimum cohort so small-cohort refusals can be demonstrated', () => {
    expect(summariseDataset(ds).smallestZone).toBeLessThan(10);
  });

  it('summary statistics match the data', () => {
    const s = summariseDataset(ds);
    expect(s.rows).toBe(300);
    expect(s.columns).toBe(9);
    expect(s.perCooperative.reduce((a, c) => a + c.farmers, 0)).toBe(300);
    expect(s.zoneSizes.reduce((a, z) => a + z.farmers, 0)).toBe(300);
  });
});
