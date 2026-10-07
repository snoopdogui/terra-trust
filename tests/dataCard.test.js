import { describe, expect, it } from 'vitest';
import { generateDataset } from '../src/core/syntheticData.js';
import { buildDataCard, LICENSE_URL } from '../src/core/dataCard.js';
import { CSV_FILE_NAME, datasetToCsv } from '../src/core/datasetExport.js';
import { sha256Hex } from '../src/core/hash.js';
import { FARMER_COLUMNS } from '../src/core/datasetStats.js';

const ds = generateDataset();
const csv = datasetToCsv(ds);

describe('CSV export', () => {
  it('has a header and one row per farmer, in the documented column order', () => {
    const lines = csv.trimEnd().split('\n');
    expect(lines[0]).toBe(FARMER_COLUMNS.map((c) => c.name).join(','));
    expect(lines).toHaveLength(301);
    expect(lines[1].split(',')).toHaveLength(FARMER_COLUMNS.length);
  });
  it('contains no consent data and no names', () => {
    expect(csv).not.toMatch(/consent|name/i);
  });
  it('hashes deterministically', async () => {
    const a = await sha256Hex(csv);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await sha256Hex(csv)).toBe(a);
    expect(await sha256Hex(`${csv} `)).not.toBe(a);
  });
});

describe('data card', () => {
  it('is valid JSON-LD with the Croissant context and the required Dataset properties', async () => {
    const card = buildDataCard(ds, { csvSha256: await sha256Hex(csv) });
    expect(JSON.parse(JSON.stringify(card))).toEqual(card);
    expect(card['@type']).toBe('sc:Dataset');
    expect(card['@context'].cr).toBe('http://mlcommons.org/croissant/');
    expect(card['@context'].rai).toBe('http://mlcommons.org/croissant/RAI/');
    expect(card.conformsTo).toBe('http://mlcommons.org/croissant/1.0');
    expect(card.license).toBe(LICENSE_URL);
    expect(card.name).toBeTruthy();
    expect(card.description.toLowerCase()).toContain('synthetic');
  });

  it('describes every column through a file object and record set', async () => {
    const hash = await sha256Hex(csv);
    const card = buildDataCard(ds, { csvSha256: hash });
    expect(card.distribution[0]).toMatchObject({ contentUrl: CSV_FILE_NAME, sha256: hash, encodingFormat: 'text/csv' });
    const fields = card.recordSet[0].field;
    expect(fields.map((f) => f.name)).toEqual(FARMER_COLUMNS.map((c) => c.name));
    for (const f of fields) {
      expect(f.description.length).toBeGreaterThan(10);
      expect(f.source.extract.column).toBe(f.name);
    }
  });

  it('omits the distribution when no hash is available rather than inventing one', () => {
    const card = buildDataCard(ds);
    expect(card.distribution).toBeUndefined();
    expect(card.recordSet).toBeUndefined();
  });

  it('states the synthetic nature, seed and generator version, and carries no timestamps or personal data', async () => {
    const card = buildDataCard(ds, { csvSha256: await sha256Hex(csv) });
    const text = JSON.stringify(card);
    expect(text).toContain(String(ds.meta.seed));
    expect(text).toContain(ds.meta.generatorVersion);
    expect(text).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i); // no email addresses
    expect(text).not.toMatch(/\u2014/);
    expect(card.datePublished).toBeUndefined();
    expect(card['rai:personalSensitiveInformation']).toMatch(/None\. All records are invented/);
  });

  it('is identical on repeat builds', async () => {
    const hash = await sha256Hex(csv);
    expect(JSON.stringify(buildDataCard(ds, { csvSha256: hash }))).toBe(JSON.stringify(buildDataCard(generateDataset(), { csvSha256: hash })));
  });
});
