// AI-readiness scorecard for the synthetic dataset.
//
// The criteria below are the sub-criteria of the Open Data Institute's "A framework for AI-ready
// data", version 2 (December 2025), in the ODI's own categories and wording. Nothing is added.
// The statuses and evidence are this project's own self-assessment, not an ODI assessment. The
// framework text read for this work lists criteria and guidance but defines no scoring scheme, so
// none is invented here: the scorecard reports a status per criterion and simple counts only.
// This is informed by the framework. It does not implement it and does not claim conformance.

import { FARMER_COLUMNS, summariseDataset, validateDataset } from './datasetStats.js';

export const ODI_SOURCE = {
  title: 'A framework for AI-ready data (version 2, December 2025)',
  publisher: 'Open Data Institute',
  url: 'https://theodi.org/insights/reports/a-framework-for-ai-ready-data/',
  doi: 'https://doi.org/10.61557/ODEX6433',
};

// A development check of the generated card with the MLCommons reference library.
// Reproduce it with scripts/export-card.mjs and scripts/validate-croissant.py.
export const CARD_CHECK = {
  library: 'mlcroissant 1.1.1',
  errors: 0,
  warnings: 'datePublished is recommended and absent',
  recordsRead: 300,
};

export const CATEGORIES = ['Dataset properties', 'Metadata', 'Surrounding infrastructure', 'Governance'];

// id, category, optional group, name. Mirrors the ODI v2 table.
export const ODI_CRITERIA = [
  { id: '1a', category: 'Dataset properties', name: 'Following international standards and norms' },
  { id: '1b', category: 'Dataset properties', name: 'Semantic and logical consistency across entries' },
  { id: '1c', category: 'Dataset properties', name: 'Identifiable class and source imbalance' },
  { id: '1d', category: 'Dataset properties', name: 'De-identification and anonymisation where necessary' },
  { id: '1e', category: 'Dataset properties', name: 'Appropriate file format' },
  { id: '2a', category: 'Metadata', name: 'Machine-readable metadata format' },
  { id: '2b', category: 'Metadata', name: 'The dataset served to users with attached metadata' },
  { id: '2c-i', category: 'Metadata', group: 'Basic technical specifications', name: 'Modalities' },
  { id: '2c-ii', category: 'Metadata', group: 'Basic technical specifications', name: 'Dimensionality' },
  { id: '2c-iii', category: 'Metadata', group: 'Basic technical specifications', name: 'Update frequency' },
  { id: '2c-iv', category: 'Metadata', group: 'Basic technical specifications', name: 'Semantics' },
  { id: '2c-v', category: 'Metadata', group: 'Basic technical specifications', name: 'Bias' },
  { id: '2c-vi', category: 'Metadata', group: 'Basic technical specifications', name: 'Basic summary statistics' },
  { id: '2c-vii', category: 'Metadata', group: 'Basic technical specifications', name: 'Synthetic data' },
  { id: '2d-i', category: 'Metadata', group: 'Supply chain information', name: 'Collection' },
  { id: '2d-ii', category: 'Metadata', group: 'Supply chain information', name: 'Preprocessing' },
  { id: '2d-iii', category: 'Metadata', group: 'Supply chain information', name: 'Annotation' },
  { id: '2e-i', category: 'Metadata', group: 'Legal and sociotechnical information', name: 'Context and original purpose' },
  { id: '2e-ii', category: 'Metadata', group: 'Legal and sociotechnical information', name: 'Licence name(s), permissions and URL(s)' },
  { id: '2e-iii', category: 'Metadata', group: 'Legal and sociotechnical information', name: 'Intended access controls' },
  { id: '2e-iv', category: 'Metadata', group: 'Legal and sociotechnical information', name: 'Data protection declaration(s)' },
  { id: '3a', category: 'Surrounding infrastructure', name: 'Accessibility via a user-centric data portal' },
  { id: '3b', category: 'Surrounding infrastructure', name: 'Accessibility via API' },
  { id: '3c', category: 'Surrounding infrastructure', name: 'Version control and monitoring infrastructure' },
  { id: '4a', category: 'Governance', name: 'Governance policy-as-code' },
  { id: '4b', category: 'Governance', name: 'Documented roles and responsibilities' },
  { id: '4c', category: 'Governance', name: 'Publicly identifiable points of contact' },
  { id: '4d', category: 'Governance', name: 'Clear data access processes' },
];

export const STATUS_LABEL = { met: 'Met', partial: 'Partly met', 'not-met': 'Not met', 'n/a': 'Not applicable' };

const done = (status, evidence) => ({ status, evidence });

export function buildScorecard(dataset, card) {
  const s = summariseDataset(dataset);
  const problems = validateDataset(dataset);
  const textCols = FARMER_COLUMNS.filter((c) => c.dataType === 'text').length;
  const numCols = FARMER_COLUMNS.length - textCols;
  const unitCols = FARMER_COLUMNS.filter((c) => c.dataType === 'number' && c.unit).length;
  const sizes = s.perCooperative.map((c) => c.farmers);
  const fields = card.recordSet?.[0]?.field ?? [];
  const has = (key) => typeof card[key] === 'string' && card[key].length > 0;
  const hasList = (key) => Array.isArray(card[key]) && card[key].length > 0;
  const rows = s.rows;

  const checks = {
    '1a': done('partial', `Currency is stated as GHS (ISO 4217) and ${unitCols} of ${numCols} numeric fields declare a unit. The other fields are project-specific categories with no external standard behind them.`),
    '1b': problems.length === 0
      ? done('met', `${textCols} categorical fields are generated from fixed vocabularies and checked on every build. ${problems.length} violations found across ${rows} rows.`)
      : done('not-met', `${problems.length} vocabulary or structure problems found, for example: ${problems[0]}.`),
    '1c': done('met', `Imbalance is reported, not removed. Cooperatives range from ${Math.min(...sizes)} to ${Math.max(...sizes)} farmers (${(Math.min(...sizes) / rows * 100).toFixed(1)}% to ${(Math.max(...sizes) / rows * 100).toFixed(1)}% of rows), zones from ${s.smallestZone} to ${s.largestZone}, and the generator's consent profile mix is ${Object.entries(s.profileCounts).map(([k, v]) => `${k} ${v}`).join(', ')}.`),
    '1d': done('partial', 'Every record is invented, so no real person can be identified. Exact age and plot size are not stored, and the query layer suppresses small groups. None of this shows how real data would fare; real data would need a proper disclosure review.'),
    '1e': card.distribution
      ? done('partial', 'A CSV export of the farmer table is provided and described by the card. There is no Parquet file and no CSV on the Web (CSVW) schema.')
      : done('not-met', 'No tabular export was produced for this card, so the card has no distribution entry.'),
    '2a': card['@context'] && card.conformsTo && fields.length > 0
      ? done('met', `JSON-LD using schema.org and Croissant terms, including the Responsible AI extension. Checked with ${CARD_CHECK.library} during development: ${CARD_CHECK.errors} errors, 1 warning (${CARD_CHECK.warnings}), ${CARD_CHECK.recordsRead} records read through the card. The app does not run that check itself.`)
      : done('partial', 'JSON-LD metadata is produced, but it has no record set describing the fields.'),
    '2b': done('not-met', 'There is no API. The card is a separate download and is not returned alongside the data by a service.'),
    '2c-i': done('met', `Tabular data: ${textCols} categorical text columns and ${numCols} numeric columns.`),
    '2c-ii': done('met', `${rows} rows by ${s.columns} columns in one flat table. No nested or layered data.`),
    '2c-iii': has('rai:dataReleaseMaintenancePlan')
      ? done('met', 'Static. The dataset is regenerated identically from the seed and generator version, with no update schedule, as the card states.')
      : done('not-met', 'The card does not state an update schedule.'),
    '2c-iv': fields.length > 0 && fields.every((f) => (f.description ?? '').length > 10)
      ? done('met', `All ${fields.length} fields have a plain-language description and a data type in the card.`)
      : done('not-met', 'The card does not describe every field.'),
    '2c-v': has('rai:dataBiases')
      ? done('partial', 'The card states how the generator shapes the data (unequal cooperative sizes, hand-chosen probabilities, uncalibrated consent profiles). No quantitative bias analysis has been done.')
      : done('not-met', 'No statement about bias is included.'),
    '2c-vi': hasList('variableMeasured')
      ? done('met', `The card gives minimum, maximum, mean and standard deviation for both numeric fields. Yield: mean ${s.yield.mean}, range ${s.yield.min} to ${s.yield.max} kg/ha. Price: mean ${s.price.mean}, range ${s.price.min} to ${s.price.max} GHS/kg.`)
      : done('not-met', 'No summary statistics are included.'),
    '2c-vii': has('description') && card.description.toLowerCase().includes('synthetic') && hasList('rai:dataCollectionType')
      ? done('met', `The dataset is described as synthetic in the card, with its generator version and seed. The app also shows a synthetic-data notice on every screen.`)
      : done('not-met', 'The card does not mark the data as synthetic.'),
    '2d-i': has('rai:dataCollection')
      ? done('met', 'The card describes how the data is generated, including the generator, the seeded random source and the fixed cooperative sizes. It uses Croissant Responsible AI properties, not Prov-O.')
      : done('not-met', 'No collection description is included.'),
    '2d-ii': has('rai:dataPreprocessingProtocol')
      ? done('met', 'The card states that exact age and plot size are banded and then discarded, and that coarse zone codes stand in for location.')
      : done('not-met', 'No preprocessing description is included.'),
    '2d-iii': has('rai:dataAnnotationProtocol')
      ? done('met', 'The card states there is no human or machine annotation, and that consent profiles are assigned by the generator.')
      : done('not-met', 'No annotation description is included.'),
    '2e-i': has('rai:dataUseCases') && has('rai:dataCollection')
      ? done('met', 'The card says why the data exists (to test consent, query policy and evaluation for a data trust), how it was made, and what it should not be used for.')
      : done('not-met', 'Context and purpose are not stated.'),
    '2e-ii': has('license')
      ? done('met', 'A licence URL is in the card (CC0 1.0 for the data). The code is under the MIT licence in the repository.')
      : done('not-met', 'No licence is stated.'),
    '2e-iii': has('conditionsOfAccess')
      ? done('partial', 'The intended access route is stated in the card as text: aggregate queries gated by purpose approval, consent and a minimum group size. It is not expressed in a machine-readable policy language such as ODRL.')
      : done('not-met', 'No access conditions are stated.'),
    '2e-iv': has('rai:personalSensitiveInformation')
      ? done('partial', 'The card states the data is invented and contains no personal data, and warns that real data with these fields would be personal data. No data protection assessment exists, because none applies to invented data.')
      : done('not-met', 'No data protection statement is included.'),
    '3a': done('not-met', 'The prototype is a demonstration interface. It is not a data portal where datasets are published and found.'),
    '3b': done('not-met', 'There is no API and no backend, by design.'),
    '3c': done('partial', 'The code is in version control and the dataset is reproducible from the generator version and seed, both stated in the card. There is no monitoring for quality or drift.'),
    '4a': done('partial', 'Purpose approval, consent, minimum group size, differencing checks and audit logging are executable code in a pure module with unit tests. They are not codified in ODRL or another machine-readable policy format.'),
    '4b': done('partial', 'The roles (farmer, cooperative, data trust, buyer) and what each can see and do are described in the app and README. There is no named data owner or steward with accountability, because nothing here is real. The role switcher is a demonstration aid, not access control.'),
    '4c': done('not-met', 'No contact point is published. The repository deliberately holds no personal data. A real dataset needs a named steward.'),
    '4d': done('partial', 'The route to data is stated and enforced in code: approved purposes, consent, aggregate-only answers and refusal reasons. There are no timelines or request process for real buyers.'),
  };

  const items = ODI_CRITERIA.map((c) => ({ ...c, ...checks[c.id] }));
  const counts = { met: 0, partial: 0, 'not-met': 0, 'n/a': 0 };
  for (const i of items) counts[i.status] += 1;
  return { source: ODI_SOURCE, items, counts, total: items.length };
}
