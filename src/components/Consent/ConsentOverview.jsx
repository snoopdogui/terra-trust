import { useMemo, useState } from 'react';
import PageTitle from '../ui/PageTitle.jsx';
import { useStore } from '../../state/store.jsx';
import { DATASET, COOP_NAME } from '../../state/dataset.js';
import { countConsent } from '../../core/consentLedger.js';
import { DATA_CATEGORIES, PURPOSES } from '../../core/constants.js';
import { formatPercent } from '../../core/format.js';

const categoryLabel = (id) => DATA_CATEGORIES.find((c) => c.id === id).short;
const purposeLabel = (id) => PURPOSES.find((p) => p.id === id).label;

export default function ConsentOverview() {
  const { state } = useStore();
  const { ledger } = state.trust;
  const [coop, setCoop] = useState('all');
  const ids = useMemo(
    () => (coop === 'all' ? DATASET.farmers : DATASET.farmers.filter((f) => f.cooperativeId === coop)).map((f) => f.id),
    [coop],
  );
  const cells = useMemo(() => countConsent(ledger, ids), [ledger, ids]);
  const recent = ledger.events.slice(-12).reverse();

  return (
    <>
      <PageTitle lede="How many farmers have allowed each use of each kind of data. Counts update the moment a farmer changes a setting on the web or on the feature phone.">
        Consent ledger
      </PageTitle>
      <div className="field">
        <label htmlFor="consent-coop">Cooperative</label>
        <select id="consent-coop" value={coop} onChange={(e) => setCoop(e.target.value)}>
          <option value="all">All cooperatives ({DATASET.farmers.length} farmers)</option>
          {DATASET.cooperatives.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="table-wrap" role="region" aria-label="Consent counts table" tabIndex={0}>
        <table>
          <caption className="sr-only">Farmers by consent level for each kind of data and purpose</caption>
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">Purpose</th>
              <th scope="col" className="num">No sharing</th>
              <th scope="col" className="num">Aggregate only</th>
              <th scope="col" className="num">Incl. per-cooperative</th>
              <th scope="col" className="num">Share consenting</th>
            </tr>
          </thead>
          <tbody>
            {cells.map((c) => (
              <tr key={`${c.category}-${c.purpose}`}>
                <th scope="row">{categoryLabel(c.category)}</th>
                <td>{purposeLabel(c.purpose)}</td>
                <td className="num">{c.none}</td>
                <td className="num">{c.aggregate}</td>
                <td className="num">{c.cooperative}</td>
                <td className="num">{formatPercent((c.aggregate + c.cooperative) / c.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Recent consent changes</h2>
      {recent.length === 0 ? (
        <p className="muted">No consent changes since the prototype was last reset.</p>
      ) : (
        <div className="table-wrap" role="region" aria-label="Recent consent changes" tabIndex={0}>
          <table>
            <caption className="sr-only">Most recent consent changes across all farmers</caption>
            <thead>
              <tr>
                <th scope="col" className="num">#</th>
                <th scope="col">Time</th>
                <th scope="col">Farmer</th>
                <th scope="col">Cooperative</th>
                <th scope="col">Data and purpose</th>
                <th scope="col">Change</th>
                <th scope="col">Channel</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => {
                const farmer = DATASET.farmers.find((f) => f.id === e.farmerId);
                return (
                  <tr key={e.seq}>
                    <td className="num">{e.seq}</td>
                    <td className="nowrap">{e.at ? new Date(e.at).toLocaleString('en-GB') : 'start'}</td>
                    <td className="mono">{e.farmerId}</td>
                    <td>{COOP_NAME[farmer.cooperativeId]}</td>
                    <td>{categoryLabel(e.category)}, {purposeLabel(e.purpose)}</td>
                    <td>{e.from} to {e.to}</td>
                    <td>{e.channel === 'ussd' ? 'USSD' : 'Web'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
