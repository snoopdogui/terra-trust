export const ROLES = [
  { id: 'farmer', label: 'Farmer' },
  { id: 'trust', label: 'Cooperative and Trust' },
  { id: 'buyer', label: 'Buyer' },
];

// Views are added here as features land. Order is the tab order.
export const VIEWS = {
  farmer: [{ id: 'overview', label: 'Overview' }],
  trust: [
    { id: 'overview', label: 'Overview' },
    { id: 'dataset', label: 'Dataset' },
  ],
  buyer: [{ id: 'overview', label: 'Overview' }],
};
