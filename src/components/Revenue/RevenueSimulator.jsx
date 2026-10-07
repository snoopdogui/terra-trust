import { useState } from 'react';
import PageTitle from '../ui/PageTitle.jsx';
import Stats from '../ui/Stats.jsx';
import { useActions, useStore } from '../../state/store.jsx';
import { COOP_NAME } from '../../state/dataset.js';
import { revenueTotals, splitAmount, validateSplit } from '../../core/revenue.js';
import { formatGhs, formatInt } from '../../core/format.js';
import { DEFAULT_SPLIT, QUERY_TYPES } from '../../core/constants.js';

const PRESETS = [
  { label: '60 / 25 / 15', split: DEFAULT_SPLIT },
  { label: '70 / 20 / 10', split: { farmers: 70, cooperative: 20, trust: 10 } },
  { label: '50 / 30 / 20', split: { farmers: 50, cooperative: 30, trust: 20 } },
];
const EXAMPLE_FEE = QUERY_TYPES.mean_yield.feePesewas;

export default function RevenueSimulator() {
  const { state } = useStore();
  const { setRevenueSplit } = useActions();
  const revenue = state.trust.revenue;
  const [draft, setDraft] = useState({
    farmers: String(revenue.split.farmers),
    cooperative: String(revenue.split.cooperative),
    trust: String(revenue.split.trust),
  });

  const parsed = { farmers: Number(draft.farmers), cooperative: Number(draft.cooperative), trust: Number(draft.trust) };
  const blank = Object.values(draft).some((v) => v.trim() === '');
  const error = blank ? 'Enter a number in all three boxes.' : validateSplit(parsed);
  const totals = revenueTotals(revenue);
  const preview = error ? null : splitAmount(EXAMPLE_FEE, [parsed.farmers, parsed.cooperative, parsed.trust]);
  const draftTotal = parsed.farmers + parsed.cooperative + parsed.trust;
  const applied = !error && parsed.farmers === revenue.split.farmers && parsed.cooperative === revenue.split.cooperative && parsed.trust === revenue.split.trust;

  const setPreset = (split) =>
    setDraft({ farmers: String(split.farmers), cooperative: String(split.cooperative), trust: String(split.trust) });

  const field = (key, label) => (
    <div className="field">
      <label htmlFor={`split-${key}`}>{label} (%)</label>
      <input
        id={`split-${key}`}
        type="number"
        min="0"
        max="100"
        step="1"
        inputMode="numeric"
        value={draft[key]}
        aria-describedby="split-total"
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        style={{ width: '7rem' }}
      />
    </div>
  );

  return (
    <>
      <PageTitle lede="Each answered query pays a fee. The fee is split between the farmers whose data counted, their cooperatives and the trust. The percentages are adjustable and apply to later queries. The amounts are illustrative and no real money moves.">
        Revenue split
      </PageTitle>

      <Stats
        label="Revenue totals"
        items={[
          { value: formatGhs(totals.total), label: 'fees from answered queries' },
          { value: formatGhs(totals.farmers), label: 'to farmers' },
          { value: formatGhs(totals.cooperative), label: 'to cooperatives' },
          { value: formatGhs(totals.trust), label: 'to the trust' },
        ]}
      />

      <fieldset>
        <legend>Split for future queries</legend>
        <div className="row">
          {field('farmers', 'Farmers')}
          {field('cooperative', 'Cooperatives')}
          {field('trust', 'Trust')}
        </div>
        <p id="split-total" role={error ? 'alert' : 'status'} className={error ? undefined : 'muted'}>
          {error ? error : `Total ${draftTotal}%.`}
          {preview ? ` On a ${formatGhs(EXAMPLE_FEE)} fee: farmers ${formatGhs(preview[0])}, cooperatives ${formatGhs(preview[1])}, trust ${formatGhs(preview[2])}.` : ''}
        </p>
        <div className="btn-row">
          <button type="button" className="btn" disabled={Boolean(error) || applied} onClick={() => setRevenueSplit(parsed)}>
            Apply split
          </button>
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className="btn btn-secondary" onClick={() => setPreset(p.split)}>
              Use {p.label}
            </button>
          ))}
        </div>
        <p className="muted">
          Current split in use: farmers {revenue.split.farmers}%, cooperatives {revenue.split.cooperative}%, trust {revenue.split.trust}%.
          The default favours farmers but is a placeholder, not a recommendation. A real split would be set with the farmers and cooperatives concerned.
        </p>
      </fieldset>

      <h2>Cooperative balances</h2>
      {Object.keys(revenue.coopBalances).length === 0 ? (
        <p className="muted">No fees yet. Release a query in the Buyer view and return here.</p>
      ) : (
        <div className="table-wrap" role="region" aria-label="Cooperative balances" tabIndex={0}>
          <table>
            <caption className="sr-only">Revenue credited to each cooperative</caption>
            <thead>
              <tr>
                <th scope="col">Cooperative</th>
                <th scope="col" className="num">Credited</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(revenue.coopBalances).sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, pesewas]) => (
                <tr key={id}>
                  <th scope="row">{COOP_NAME[id] ?? id}</th>
                  <td className="num">{formatGhs(pesewas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Running ledger</h2>
      {revenue.entries.length === 0 ? (
        <p className="muted">The ledger fills as buyers receive answers.</p>
      ) : (
        <div className="table-wrap" role="region" aria-label="Revenue ledger" tabIndex={0}>
          <table>
            <caption className="sr-only">One row per answered query, newest first</caption>
            <thead>
              <tr>
                <th scope="col" className="num">Query</th>
                <th scope="col">Time</th>
                <th scope="col" className="num">Fee</th>
                <th scope="col" className="num">Farmers</th>
                <th scope="col" className="num">Cooperatives</th>
                <th scope="col" className="num">Trust</th>
                <th scope="col">Split used</th>
                <th scope="col" className="num">Farmers counted</th>
              </tr>
            </thead>
            <tbody>
              {revenue.entries.slice().reverse().map((e) => (
                <tr key={e.queryId}>
                  <td className="num">{e.queryId}</td>
                  <td className="nowrap">{e.at ? new Date(e.at).toLocaleString('en-GB') : ''}</td>
                  <td className="num">{formatGhs(e.feePesewas)}</td>
                  <td className="num">{formatGhs(e.farmersPool)}</td>
                  <td className="num">{formatGhs(e.coopPool)}</td>
                  <td className="num">{formatGhs(e.trustPool)}</td>
                  <td className="nowrap">{e.split.farmers} / {e.split.cooperative} / {e.split.trust}</td>
                  <td className="num">{formatInt(e.contributorCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted">
        The farmers' share of each fee is divided equally among the farmers whose data counted toward that answer.
        Refused queries earn nothing.
      </p>
    </>
  );
}
