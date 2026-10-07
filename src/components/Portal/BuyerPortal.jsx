import { useEffect, useRef, useState } from 'react';
import PageTitle from '../ui/PageTitle.jsx';
import BuyerPicker from './BuyerPicker.jsx';
import QueryOutcome from './QueryOutcome.jsx';
import { useActions, useStore } from '../../state/store.jsx';
import { DATASET } from '../../state/dataset.js';
import { AGE_BANDS, FILTER_DIMENSIONS, GENDERS, PLOT_BANDS, PURPOSES, QUERY_TYPES, VARIETIES } from '../../core/constants.js';
import { queryFee } from '../../core/pricing.js';
import { formatGhs } from '../../core/format.js';

const OPTIONS = {
  cooperative: DATASET.cooperatives.map((c) => ({ value: c.id, label: c.name })),
  zone: DATASET.zones.map((z) => ({ value: z.id, label: `Zone ${z.id}` })),
  ageBand: AGE_BANDS.map((v) => ({ value: v, label: v })),
  gender: GENDERS.map((v) => ({ value: v, label: v })),
  plotSizeBand: PLOT_BANDS.map((v) => ({ value: v, label: v })),
  variety: VARIETIES.map((v) => ({ value: v, label: v })),
};
const UNDER_65 = ['18-34', '35-44', '45-54', '55-64'];

// Examples chosen against the default synthetic data. Consent changes can alter their outcome.
const EXAMPLES = [
  { label: 'A broad question', note: 'All farmers. Expected: released.', buyerId: 'buyer-a', purpose: 'supply_chain_planning', queryType: 'mean_yield', filter: {}, groupBy: false },
  { label: 'A very narrow selection', note: 'One small zone. Expected: refused, group too small.', buyerId: 'buyer-a', purpose: 'supply_chain_planning', queryType: 'mean_yield', filter: { zone: ['D3'] }, groupBy: false },
  { label: 'A purpose the buyer is not approved for', note: 'Synthetic Buyer C asks for EUDR due diligence. Expected: refused, purpose.', buyerId: 'buyer-c', purpose: 'eudr_due_diligence', queryType: 'mean_yield', filter: {}, groupBy: false },
  { label: 'Results per cooperative, all six', note: 'Some cooperatives have too few farmers who allow per-cooperative results. Expected: refused.', buyerId: 'buyer-a', purpose: 'supply_chain_planning', queryType: 'mean_yield', filter: {}, groupBy: true },
  { label: 'Differencing, step 1: Cooperative F', note: 'Run this first. Expected: released.', buyerId: 'buyer-a', purpose: 'supply_chain_planning', queryType: 'mean_yield', filter: { cooperative: ['coop-f'] }, groupBy: false },
  { label: 'Differencing, step 2: same, leaving out ages 65+', note: 'Run after step 1. Subtracting the two answers could expose a few people. Expected: refused, differencing.', buyerId: 'buyer-a', purpose: 'supply_chain_planning', queryType: 'mean_yield', filter: { cooperative: ['coop-f'], ageBand: UNDER_65 }, groupBy: false },
];

export default function BuyerPortal() {
  const { state } = useStore();
  const { submitQuery, selectBuyer } = useActions();
  const buyerId = state.buyerId;

  const [purpose, setPurpose] = useState('supply_chain_planning');
  const [queryType, setQueryType] = useState('mean_yield');
  const [filter, setFilter] = useState({});
  const [groupBy, setGroupBy] = useState(false);

  const entry = state.trust.audit.find((e) => e.id === state.lastQueryId && e.buyerId === buyerId) ?? null;
  const headingRef = useRef(null);
  const submitted = useRef(false);
  useEffect(() => {
    if (submitted.current && entry) {
      headingRef.current?.focus();
      submitted.current = false;
    }
  }, [state.lastQueryId, entry]);

  function toggle(dim, value) {
    setFilter((f) => {
      const current = f[dim] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      const copy = { ...f, [dim]: next };
      if (next.length === 0) delete copy[dim];
      return copy;
    });
  }

  function loadExample(ex) {
    selectBuyer(ex.buyerId);
    setPurpose(ex.purpose);
    setQueryType(ex.queryType);
    setFilter(ex.filter);
    setGroupBy(ex.groupBy);
  }

  function run(e) {
    e.preventDefault();
    submitted.current = true;
    submitQuery({ buyerId, purpose, queryType, filter, groupBy: groupBy ? 'cooperative' : null });
  }

  return (
    <>
      <PageTitle lede="Ask a question for a stated purpose. You receive an aggregate, or a refusal with the reason. You never receive individual records.">
        Buyer query portal
      </PageTitle>
      <BuyerPicker />

      <h2>Examples to try</h2>
      <p className="muted">Each button fills in the form. Then press Run query.</p>
      <ul>
        {EXAMPLES.map((ex) => (
          <li key={ex.label}>
            <button type="button" className="btn btn-secondary" onClick={() => loadExample(ex)}>{ex.label}</button>{' '}
            <span className="muted">{ex.note}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={run}>
        <h2>Your query</h2>
        <fieldset>
          <legend>Purpose</legend>
          <div className="checks">
            {PURPOSES.map((p) => (
              <label key={p.id}>
                <input type="radio" name="purpose" value={p.id} checked={purpose === p.id} onChange={() => setPurpose(p.id)} />
                {p.label}
              </label>
            ))}
          </div>
          <span className="hint">{PURPOSES.find((p) => p.id === purpose).description}</span>
        </fieldset>

        <div className="field">
          <label htmlFor="query-type">Question</label>
          <select id="query-type" value={queryType} onChange={(e) => setQueryType(e.target.value)}>
            {Object.values(QUERY_TYPES).map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <span className="hint">Every question returns an aggregate. Direct identifiers cannot be used as filters.</span>
        </div>

        <fieldset>
          <legend>Narrow the selection (optional)</legend>
          {Object.entries(FILTER_DIMENSIONS).map(([dim, def]) => {
            const selected = filter[dim] ?? [];
            return (
              <details key={dim}>
                <summary>{def.label}: {selected.length ? `${selected.length} selected` : 'any'}</summary>
                <div className="checks" style={{ padding: '0.5rem 0' }}>
                  {OPTIONS[dim].map((o) => (
                    <label key={o.value}>
                      <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(dim, o.value)} />
                      {o.label}
                    </label>
                  ))}
                </div>
              </details>
            );
          })}
        </fieldset>

        <div className="field">
          <label className="checks">
            <input type="checkbox" checked={groupBy} onChange={(e) => setGroupBy(e.target.checked)} />
            Report one row per cooperative
          </label>
          <span className="hint">Only farmers who allowed per-cooperative results are counted, and every cooperative needs enough of them.</span>
        </div>

        <div className="btn-row">
          <button type="submit" className="btn">Run query</button>
          <span className="muted" style={{ alignSelf: 'center' }}>
            Fee if answered: {formatGhs(queryFee(queryType, groupBy ? 'cooperative' : null))}
          </span>
        </div>
      </form>

      <div aria-live="polite">{entry ? <QueryOutcome entry={entry} headingRef={headingRef} /> : null}</div>
    </>
  );
}
