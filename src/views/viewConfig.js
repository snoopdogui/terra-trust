export const ROLES = [
  { id: 'farmer', label: 'Farmer' },
  { id: 'trust', label: 'Cooperative and Trust' },
  { id: 'buyer', label: 'Buyer' },
];

// Views are added here as features land. Order is the tab order.
export const VIEWS = {
  farmer: [
    { id: 'overview', label: 'Overview' },
    { id: 'consent', label: 'My consent' },
    { id: 'phone', label: 'Feature phone (USSD)' },
    { id: 'earnings', label: 'My earnings' },
  ],
  trust: [
    { id: 'overview', label: 'Overview' },
    { id: 'dataset', label: 'Dataset' },
    { id: 'consent', label: 'Consent ledger' },
    { id: 'audit', label: 'Audit log' },
    { id: 'revenue', label: 'Revenue split' },
    { id: 'evaluation', label: 'Evaluation' },
  ],
  buyer: [
    { id: 'overview', label: 'Overview' },
    { id: 'portal', label: 'Query portal' },
    { id: 'history', label: 'My queries' },
  ],
};
