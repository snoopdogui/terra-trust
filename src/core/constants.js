// Shared vocabularies and defaults. Everything here is synthetic or illustrative.

export const DEFAULT_SEED = 7301;
export const FARMER_COUNT = 300;
export const GENERATOR_VERSION = '1.0.0';

export const DEFAULT_MIN_COHORT = 10;
export const MIN_COHORT_BOUNDS = { min: 2, max: 50 };
export const HISTORY_WINDOW = 500; // earlier answers per buyer that the differencing guard compares against
export const HISTORY_CAP = 1000; // total stored answers, to keep localStorage small

export const CURRENCY = 'GHS';

// Coarsened quasi-identifiers. Exact ages and plot sizes are never stored in the shared data.
export const AGE_BANDS = ['18-34', '35-44', '45-54', '55-64', '65+'];
export const GENDERS = ['F', 'M'];
export const PLOT_BANDS = ['<1 ha', '1-2 ha', '2-3 ha', '>3 ha'];
export const VARIETIES = ['Amelonado', 'Amazon', 'Trinitario', 'Hybrid'];

export const DATA_CATEGORIES = [
  { id: 'plot_location', label: 'Plot location (coarse zone)', short: 'Plot location' },
  { id: 'yield', label: 'Yield', short: 'Yield' },
  { id: 'price', label: 'Price received', short: 'Price' },
];

export const PURPOSES = [
  {
    id: 'eudr_due_diligence',
    label: 'EUDR due diligence',
    short: 'EUDR',
    description:
      'Supporting a buyer in documenting where and how much of a commodity comes from. Illustrative only, not a statement of what the regulation requires.',
  },
  {
    id: 'price_benchmarking',
    label: 'Price benchmarking',
    short: 'Price benchmarking',
    description: 'Comparing prices received by farmers across groups.',
  },
  {
    id: 'supply_chain_planning',
    label: 'Supply chain planning',
    short: 'Supply planning',
    description: 'Estimating the volume and spread of supply.',
  },
];

// Ordered from least to most permissive.
export const CONSENT_LEVELS = [
  { id: 'none', label: 'No sharing', ussd: 'None', rank: 0 },
  { id: 'aggregate', label: 'Aggregate results only', ussd: 'Aggregate', rank: 1 },
  {
    id: 'cooperative',
    label: 'Aggregate, including per-cooperative results',
    ussd: 'Cooperative',
    rank: 2,
  },
];
export const LEVEL_RANK = Object.fromEntries(CONSENT_LEVELS.map((l) => [l.id, l.rank]));

// Query types the portal offers. Every one returns aggregates only.
export const QUERY_TYPES = {
  count_farmers: {
    id: 'count_farmers',
    label: 'Number of farmers',
    categories: ['plot_location'],
    purposes: ['eudr_due_diligence', 'supply_chain_planning'],
    feePesewas: 5000,
  },
  mean_yield: {
    id: 'mean_yield',
    label: 'Mean yield (kg/ha)',
    categories: ['yield'],
    purposes: ['eudr_due_diligence', 'supply_chain_planning'],
    feePesewas: 12000,
  },
  mean_price: {
    id: 'mean_price',
    label: 'Mean price received (GHS/kg)',
    categories: ['price'],
    purposes: ['price_benchmarking'],
    feePesewas: 12000,
  },
  price_spread: {
    id: 'price_spread',
    label: 'Price mean and spread (GHS/kg)',
    categories: ['price'],
    purposes: ['price_benchmarking'],
    feePesewas: 15000,
  },
};
export const GROUP_BY_OPTIONS = ['cooperative'];
export const GROUP_BY_FEE_MULTIPLIER = 2;

// Filters a buyer may use. Direct identifiers are deliberately absent.
export const FILTER_DIMENSIONS = {
  cooperative: { label: 'Cooperative', field: 'cooperativeId' },
  zone: { label: 'Zone', field: 'zoneId' },
  ageBand: { label: 'Age band', field: 'ageBand', values: AGE_BANDS },
  gender: { label: 'Gender', field: 'gender', values: GENDERS },
  plotSizeBand: { label: 'Plot size', field: 'plotSizeBand', values: PLOT_BANDS },
  variety: { label: 'Variety', field: 'variety', values: VARIETIES },
};

// Illustrative split. Not a recommendation.
export const DEFAULT_SPLIT = { farmers: 60, cooperative: 25, trust: 15 };

// Synthetic buyers. Not real organisations.
export const BUYERS = [
  {
    id: 'buyer-a',
    name: 'Synthetic Buyer A',
    kind: 'chocolate manufacturer',
    purposes: ['eudr_due_diligence', 'supply_chain_planning'],
  },
  {
    id: 'buyer-b',
    name: 'Synthetic Buyer B',
    kind: 'commodity trading house',
    purposes: ['price_benchmarking', 'supply_chain_planning'],
  },
  {
    id: 'buyer-c',
    name: 'Synthetic Buyer C',
    kind: 'price research body',
    purposes: ['price_benchmarking'],
  },
];

export const STORAGE_KEY = 'terra-trust:v1';
