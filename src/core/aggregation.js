// Aggregate-only query executors. Each takes groups of already-consented farmers and returns a
// small table. Nothing here returns an individual record.

const round = (x, digits) => Math.round(x * 10 ** digits) / 10 ** digits;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const populationSd = (xs) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};

const METRICS = {
  count_farmers: {
    columns: ['Farmers (n)'],
    compute: (farmers) => [farmers.length],
  },
  mean_yield: {
    columns: ['Farmers (n)', 'Mean yield (kg/ha)'],
    compute: (farmers) => [farmers.length, round(mean(farmers.map((f) => f.yieldKgHa)), 1)],
  },
  mean_price: {
    columns: ['Farmers (n)', 'Mean price received (GHS/kg)'],
    compute: (farmers) => [farmers.length, round(mean(farmers.map((f) => f.priceGhsPerKg)), 2)],
  },
  price_spread: {
    columns: ['Farmers (n)', 'Mean price (GHS/kg)', 'Standard deviation (GHS/kg)'],
    compute: (farmers) => {
      const prices = farmers.map((f) => f.priceGhsPerKg);
      return [farmers.length, round(mean(prices), 2), round(populationSd(prices), 2)];
    },
  },
};

/** groups: [{ label, farmers }]. Returns { columns, rows }. */
export function aggregate(queryType, groups) {
  const metric = METRICS[queryType];
  return {
    columns: ['Group', ...metric.columns],
    rows: groups.map((g) => [g.label, ...metric.compute(g.farmers)]),
  };
}
