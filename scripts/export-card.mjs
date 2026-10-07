// Writes the data card and CSV export to a folder, using the same code as the app.
// Usage: node scripts/export-card.mjs [outputDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateDataset } from '../src/core/syntheticData.js';
import { datasetToCsv, CSV_FILE_NAME } from '../src/core/datasetExport.js';
import { buildDataCard, CARD_FILE_NAME } from '../src/core/dataCard.js';
import { sha256Hex } from '../src/core/hash.js';

const outDir = process.argv[2] ?? 'card-out';
mkdirSync(outDir, { recursive: true });
const dataset = generateDataset();
const csv = datasetToCsv(dataset);
const card = buildDataCard(dataset, { csvSha256: await sha256Hex(csv) });
writeFileSync(join(outDir, CSV_FILE_NAME), csv);
writeFileSync(join(outDir, CARD_FILE_NAME), `${JSON.stringify(card, null, 2)}\n`);
console.log(`Wrote ${CARD_FILE_NAME} and ${CSV_FILE_NAME} to ${outDir}`);
