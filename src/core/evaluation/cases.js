// Adversarial test cases for the policy engine. Each case is data: a short sequence of steps run
// on a fresh copy of the fixture, with an expected outcome for every query step.
//
// Step kinds:
//   { op: 'query', request, expect: { decision, code? } }
//   { op: 'setConsent', who, category, purpose, level, note }
//   { op: 'withdrawAll', who, note }
//   { op: 'setConfig', minCohort, note }
// `who` selects fixture farmers: { zone, index? , count? }.
//
// Expectations are written from the threat model, not read off the engine's output.
// Cases marked knownGap describe attacks the prototype does NOT stop. They state the outcome a
// stronger system would give, and they are reported separately, not in the pass rate.

const UNDER_65 = ['18-34', '35-44', '45-54', '55-64'];
const base = { buyerId: 'buyer-1', purpose: 'supply_chain_planning', queryType: 'mean_yield', filter: {}, groupBy: null };

const ask = (over, expect) => ({ op: 'query', request: { ...base, ...over }, expect });
const allow = { decision: 'allow' };
const refuse = (code) => (code ? { decision: 'refuse', code } : { decision: 'refuse' });
const consent = (who, category, purpose, level, note) => ({ op: 'setConsent', who, category, purpose, level, note });

export const CATEGORIES = [
  're-identification',
  'small cohort',
  'differencing',
  'purpose and consent',
  'consent withdrawal',
  'known gap',
];

export const CASES = [
  // ---- re-identification: narrowing a selection until one person remains ----
  {
    id: 'RI-01',
    category: 're-identification',
    title: 'Isolate the only farmer aged 65+ in a zone',
    attack: 'Filter by zone and age band to reach a group of one, then read the mean yield.',
    steps: [ask({ filter: { zone: ['A1'], ageBand: ['65+'] } }, refuse('COHORT_TOO_SMALL'))],
  },
  {
    id: 'RI-02',
    category: 're-identification',
    title: 'Probe whether a specific person exists with a count query',
    attack: 'Use the farmer count on a unique combination of zone, age band and gender to confirm one person.',
    steps: [
      ask(
        { purpose: 'eudr_due_diligence', queryType: 'count_farmers', filter: { zone: ['A1'], ageBand: ['65+'], gender: ['F'] } },
        refuse('COHORT_TOO_SMALL'),
      ),
    ],
  },
  {
    id: 'RI-03',
    category: 're-identification',
    title: 'Narrow step by step from a cooperative to one farmer',
    attack: 'Start broad, then add one filter at a time. Early steps are fine, the last one reaches a group of one.',
    steps: [
      ask({ filter: { cooperative: ['fx-a'] } }, allow),
      ask({ filter: { zone: ['A1'] } }, allow),
      ask({ filter: { zone: ['A1'], ageBand: ['65+'] } }, refuse('COHORT_TOO_SMALL')),
    ],
  },
  {
    id: 'RI-04',
    category: 're-identification',
    title: 'Per-cooperative results that include a tiny cooperative',
    attack: 'Ask for one row per cooperative so that the smallest cooperative (4 farmers) is reported on its own.',
    steps: [ask({ groupBy: 'cooperative' }, refuse('COHORT_TOO_SMALL'))],
  },

  // ---- small cohorts: the minimum group size ----
  {
    id: 'SC-01',
    category: 'small cohort',
    title: 'One farmer below the minimum (9 of 10)',
    attack: 'Ask about a zone with exactly 9 consenting farmers.',
    steps: [ask({ filter: { zone: ['B1'] } }, refuse('COHORT_TOO_SMALL'))],
  },
  {
    id: 'SC-02',
    category: 'small cohort',
    title: 'Exactly the minimum (10 of 10) is released',
    control: true,
    attack: 'Control: a group of exactly 10 consenting farmers meets the threshold.',
    steps: [ask({ filter: { zone: ['A3'] } }, allow)],
  },
  {
    id: 'SC-03',
    category: 'small cohort',
    title: 'Large population, few consenting',
    attack: 'A zone of 20 farmers where 14 have withheld consent leaves only 6 who can count.',
    steps: [
      { op: 'setConsent', who: { zone: 'B2', count: 14 }, category: 'yield', purpose: 'supply_chain_planning', level: 'none', note: '14 of the 20 farmers in zone B2 withhold yield consent for supply chain planning.' },
      ask({ filter: { zone: ['B2'] } }, refuse('COHORT_TOO_SMALL')),
    ],
  },
  {
    id: 'SC-04',
    category: 'small cohort',
    title: 'Raising the minimum cohort size takes effect immediately',
    attack: 'A group of 12 is released at k = 10 and refused once the trust raises k to 15.',
    steps: [
      ask({ filter: { zone: ['A2'] } }, allow),
      { op: 'setConfig', minCohort: 15, note: 'The trust raises the minimum group size to 15.' },
      ask({ filter: { zone: ['A2'] } }, refuse('COHORT_TOO_SMALL')),
    ],
  },

  // ---- differencing: subtracting two nearly identical answers ----
  {
    id: 'DF-01',
    category: 'differencing',
    title: 'Leave one person out',
    attack: 'Ask for a zone, then ask again leaving out the one farmer aged 65+. The two means differ by that farmer\'s value.',
    steps: [
      ask({ filter: { zone: ['A1'] } }, allow),
      ask({ filter: { zone: ['A1'], ageBand: UNDER_65 } }, refuse('DIFFERENCING_RISK')),
    ],
  },
  {
    id: 'DF-02',
    category: 'differencing',
    title: 'Differencing through a different query type',
    attack: 'Use the price mean first, then the price spread on a group that leaves one person out.',
    steps: [
      ask({ purpose: 'price_benchmarking', queryType: 'mean_price', filter: { zone: ['A1'] } }, allow),
      ask({ purpose: 'price_benchmarking', queryType: 'price_spread', filter: { zone: ['A1'], ageBand: UNDER_65 } }, refuse('DIFFERENCING_RISK')),
    ],
  },
  {
    id: 'DF-03',
    category: 'differencing',
    title: 'Differencing across purposes',
    attack: 'One farmer has not consented for EUDR due diligence. Ask the same question under each purpose and subtract.',
    steps: [
      consent({ zone: 'A2', index: 0 }, 'yield', 'eudr_due_diligence', 'none', 'One farmer in zone A2 withholds yield consent for EUDR due diligence only.'),
      ask({ filter: { zone: ['A2'] } }, allow),
      ask({ purpose: 'eudr_due_diligence', filter: { zone: ['A2'] } }, refuse('DIFFERENCING_RISK')),
    ],
  },
  {
    id: 'DF-04',
    category: 'differencing',
    title: 'A difference of exactly k is allowed',
    control: true,
    attack: 'Control: two answers whose groups differ by exactly 10 farmers do not isolate anyone.',
    steps: [
      ask({ filter: { zone: ['C1', 'H1'] } }, allow),
      ask({ filter: { zone: ['C1'] } }, allow),
    ],
  },
  {
    id: 'DF-05',
    category: 'differencing',
    title: 'Unrelated groups are allowed',
    control: true,
    attack: 'Control: two groups with no farmers in common cannot be differenced.',
    steps: [ask({ filter: { zone: ['A1'] } }, allow), ask({ filter: { zone: ['C1'] } }, allow)],
  },
  {
    id: 'DF-06',
    category: 'differencing',
    title: 'Repeating the identical query is allowed',
    control: true,
    attack: 'Control: asking the same question again reveals nothing new.',
    steps: [ask({ filter: { zone: ['A1'] } }, allow), ask({ filter: { zone: ['A1'] } }, allow)],
  },

  // ---- purpose and consent ----
  {
    id: 'PV-01',
    category: 'purpose and consent',
    title: 'Buyer asks for a purpose it is not approved for',
    attack: 'A buyer approved only for price benchmarking asks for EUDR due diligence.',
    steps: [ask({ buyerId: 'buyer-3', purpose: 'eudr_due_diligence' }, refuse('PURPOSE_NOT_PERMITTED'))],
  },
  {
    id: 'PV-02',
    category: 'purpose and consent',
    title: 'Question that does not fit the stated purpose',
    attack: 'An approved buyer asks for price data while stating the EUDR due diligence purpose.',
    steps: [ask({ purpose: 'eudr_due_diligence', queryType: 'mean_price' }, refuse('PURPOSE_NOT_PERMITTED'))],
  },
  {
    id: 'PV-03',
    category: 'purpose and consent',
    title: 'Consent is per purpose',
    attack: 'Every farmer in a zone withholds yield consent for supply chain planning but not for EUDR due diligence.',
    steps: [
      consent({ zone: 'A2' }, 'yield', 'supply_chain_planning', 'none', 'All 12 farmers in zone A2 withhold yield consent for supply chain planning.'),
      ask({ filter: { zone: ['A2'] } }, refuse('NO_CONSENT')),
      ask({ purpose: 'eudr_due_diligence', filter: { zone: ['A2'] } }, allow),
    ],
  },
  {
    id: 'PV-04',
    category: 'purpose and consent',
    title: 'Unknown purpose',
    attack: 'Submit a purpose that does not exist, such as marketing.',
    steps: [ask({ purpose: 'marketing' }, refuse('INVALID_REQUEST'))],
  },
  {
    id: 'PV-05',
    category: 'purpose and consent',
    title: 'Filter on a direct identifier',
    attack: 'Try to select a farmer by ID.',
    steps: [ask({ filter: { farmerId: ['FX-A1-00'] } }, refuse('INVALID_REQUEST'))],
  },

  // ---- consent withdrawal mid-session ----
  {
    id: 'CW-01',
    category: 'consent withdrawal',
    title: 'A farmer withdraws between two identical queries',
    attack: 'Query a zone, wait for one farmer to withdraw, query again, and subtract.',
    steps: [
      ask({ filter: { zone: ['A2'] } }, allow),
      { op: 'withdrawAll', who: { zone: 'A2', index: 0 }, note: 'One farmer in zone A2 withdraws all consent.' },
      ask({ filter: { zone: ['A2'] } }, refuse('DIFFERENCING_RISK')),
    ],
  },
  {
    id: 'CW-02',
    category: 'consent withdrawal',
    title: 'Withdrawal drops a group below the minimum',
    attack: 'A group of exactly 10 loses one member between queries.',
    steps: [
      ask({ filter: { zone: ['A3'] } }, allow),
      { op: 'withdrawAll', who: { zone: 'A3', index: 0 }, note: 'One farmer in zone A3 withdraws all consent.' },
      ask({ filter: { zone: ['A3'] } }, refuse('COHORT_TOO_SMALL')),
    ],
  },
  {
    id: 'CW-03',
    category: 'consent withdrawal',
    title: 'Everyone withdraws for the purpose',
    attack: 'Every farmer in a zone withdraws mid-session. The buyer repeats the query.',
    steps: [
      ask({ purpose: 'eudr_due_diligence', filter: { zone: ['A2'] } }, allow),
      consent({ zone: 'A2' }, 'yield', 'eudr_due_diligence', 'none', 'All 12 farmers in zone A2 withdraw yield consent for EUDR due diligence.'),
      ask({ purpose: 'eudr_due_diligence', filter: { zone: ['A2'] } }, refuse('NO_CONSENT')),
    ],
  },
  {
    id: 'CW-04',
    category: 'consent withdrawal',
    title: 'Withdrawing something unrelated changes nothing',
    control: true,
    attack: 'Control: a farmer withdraws price consent for another purpose. A yield query for EUDR is unaffected.',
    steps: [
      ask({ purpose: 'eudr_due_diligence', filter: { zone: ['A2'] } }, allow),
      consent({ zone: 'A2', index: 0 }, 'price', 'price_benchmarking', 'none', 'One farmer in zone A2 withdraws price consent for price benchmarking.'),
      ask({ purpose: 'eudr_due_diligence', filter: { zone: ['A2'] } }, allow),
    ],
  },
  {
    id: 'CW-05',
    category: 'consent withdrawal',
    title: 'Downgrading from per-cooperative to aggregate between grouped queries',
    attack: 'A grouped query is released. One farmer then allows aggregate use only, shrinking one group by one.',
    steps: [
      ask({ filter: { zone: ['A1', 'B2', 'C1'] }, groupBy: 'cooperative' }, allow),
      consent({ zone: 'A1', index: 1 }, 'yield', 'supply_chain_planning', 'aggregate', 'One farmer in zone A1 changes yield consent for supply chain planning to aggregate only.'),
      ask({ filter: { zone: ['A1', 'B2', 'C1'] }, groupBy: 'cooperative' }, refuse('DIFFERENCING_RISK')),
    ],
  },
  {
    id: 'CW-06',
    category: 'consent withdrawal',
    title: 'Re-granting consent takes effect immediately',
    control: true,
    attack: 'Control: a refused group becomes answerable as soon as a farmer consents again.',
    steps: [
      consent({ zone: 'A3', index: 0 }, 'yield', 'supply_chain_planning', 'none', 'One farmer in zone A3 withholds yield consent for supply chain planning.'),
      ask({ filter: { zone: ['A3'] } }, refuse('COHORT_TOO_SMALL')),
      consent({ zone: 'A3', index: 0 }, 'yield', 'supply_chain_planning', 'aggregate', 'The same farmer consents again, aggregate only.'),
      ask({ filter: { zone: ['A3'] } }, allow),
    ],
  },

  // ---- known gaps: attacks this prototype does not stop ----
  {
    id: 'GAP-01',
    category: 'known gap',
    knownGap: true,
    title: 'Homogeneous group',
    attack: 'A zone of exactly 10 farmers who all have the same yield. The mean reveals every one of them.',
    why: 'The engine checks group size, not whether the values in the group vary. A stronger system would also check for low variance or add noise.',
    steps: [ask({ filter: { zone: ['H1'] } }, refuse())],
  },
  {
    id: 'GAP-02',
    category: 'known gap',
    knownGap: true,
    title: 'Two buyers pool their answers',
    attack: 'Buyer 1 asks about a zone. Buyer 2 asks about the same zone leaving one person out. Together they difference the two answers.',
    why: 'The differencing guard compares each buyer only with its own history. A stronger system would track answers across buyers.',
    steps: [
      ask({ buyerId: 'buyer-1', filter: { zone: ['A1'] } }, allow),
      ask({ buyerId: 'buyer-2', filter: { zone: ['A1'], ageBand: UNDER_65 } }, refuse()),
    ],
  },
];
