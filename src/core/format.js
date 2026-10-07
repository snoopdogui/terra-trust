const nf0 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatInt = (n) => nf0.format(n);
export const formatOne = (n) => nf1.format(n);
export const formatTwo = (n) => nf2.format(n);
export const formatPercent = (fraction) => `${nf1.format(fraction * 100)}%`;

/** Money is held in integer pesewas (1 GHS = 100 pesewas) to avoid rounding drift. */
export const formatGhs = (pesewas) => `GHS ${nf2.format(pesewas / 100)}`;
