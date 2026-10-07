import { describe, expect, it } from 'vitest';
import { generateDataset } from '../src/core/syntheticData.js';
import { buildDataCard } from '../src/core/dataCard.js';
import { datasetToCsv } from '../src/core/datasetExport.js';
import { sha256Hex } from '../src/core/hash.js';
import { buildScorecard, CATEGORIES, ODI_CRITERIA, ODI_SOURCE, STATUS_LABEL } from '../src/core/readiness.js';

const ds = generateDataset();
const card = buildDataCard(ds, { csvSha256: await sha256Hex(datasetToCsv(ds)) });

// The 28 sub-criteria listed in the ODI framework v2 table (December 2025), by id. If the project
// adds or removes a criterion, this test fails: the scorecard must not invent criteria.
const ODI_V2_IDS = [
  '1a', '1b', '1c', '1d', '1e',
  '2a', '2b', '2c-i', '2c-ii', '2c-iii', '2c-iv', '2c-v', '2c-vi', '2c-vii', '2d-i', '2d-ii', '2d-iii', '2e-i', '2e-ii', '2e-iii', '2e-iv',
  '3a', '3b', '3c',
  '4a', '4b', '4c', '4d',
];

describe('scorecard criteria', () => {
  it('uses exactly the ODI v2 sub-criteria and nothing else', () => {
    expect(ODI_CRITERIA.map((c) => c.id)).toEqual(ODI_V2_IDS);
    expect(new Set(ODI_CRITERIA.map((c) => c.category))).toEqual(new Set(CATEGORIES));
  });
  it('cites the source and its version', () => {
    expect(ODI_SOURCE.url).toContain('theodi.org');
    expect(ODI_SOURCE.title).toContain('version 2');
  });
});

describe('scorecard assessment', () => {
  const card0 = buildScorecard(ds, card);

  it('gives every criterion a valid status and non-empty evidence', () => {
    expect(card0.items).toHaveLength(ODI_V2_IDS.length);
    for (const i of card0.items) {
      expect(Object.keys(STATUS_LABEL)).toContain(i.status);
      expect(i.evidence.length).toBeGreaterThan(20);
      expect(i.evidence).not.toMatch(/\u2014/);
    }
  });

  it('counts add up and no overall score is produced', () => {
    const sum = Object.values(card0.counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(card0.total);
    expect(card0).not.toHaveProperty('score');
    expect(card0).not.toHaveProperty('percent');
  });

  it('computes evidence from the data, not from fixed text', () => {
    const dim = card0.items.find((i) => i.id === '2c-ii');
    expect(dim.evidence).toContain('300 rows by 9 columns');
    const bias = card0.items.find((i) => i.id === '1c');
    expect(bias.evidence).toContain('28 to 78 farmers');
  });

  it('is honest about what the prototype lacks', () => {
    const status = Object.fromEntries(card0.items.map((i) => [i.id, i.status]));
    for (const id of ['2b', '3a', '3b', '4c']) expect(status[id]).toBe('not-met');
    for (const id of ['4a', '2e-iii', '3c']) expect(status[id]).toBe('partial');
  });

  it('downgrades when the evidence is missing', () => {
    const bare = buildScorecard(ds, buildDataCard(ds)); // no hash, so no distribution or record set
    const status = Object.fromEntries(bare.items.map((i) => [i.id, i.status]));
    expect(status['1e']).toBe('not-met');
    expect(status['2a']).toBe('partial');
    expect(status['2c-iv']).toBe('not-met');
  });

  it('reports a failing vocabulary check', () => {
    const broken = structuredClone(ds);
    broken.farmers[0].ageBand = 'about forty';
    const result = buildScorecard(broken, card);
    expect(result.items.find((i) => i.id === '1b').status).toBe('not-met');
  });
});
