import { useState } from 'react';
import PageTitle from '../ui/PageTitle.jsx';
import FarmerPicker from './FarmerPicker.jsx';
import { useActions, useStore } from '../../state/store.jsx';
import { CONSENT_LEVELS, DATA_CATEGORIES, PURPOSES } from '../../core/constants.js';
import { eventsForFarmer, getLevel } from '../../core/consentLedger.js';

const levelLabel = (id) => CONSENT_LEVELS.find((l) => l.id === id).label;
const categoryLabel = (id) => DATA_CATEGORIES.find((c) => c.id === id).short;
const purposeLabel = (id) => PURPOSES.find((p) => p.id === id).label;
const channelLabel = { web: 'Web', ussd: 'Feature phone (USSD)' };

export default function FarmerConsentView() {
  const { state } = useStore();
  const { setConsent, withdrawAll } = useActions();
  const [status, setStatus] = useState('');
  const { ledger } = state.trust;
  const farmerId = state.farmerId;
  const history = eventsForFarmer(ledger, farmerId).slice(-8).reverse();

  function onChange(category, purpose, level) {
    setConsent({ farmerId, category, purpose, level, channel: 'web' });
    setStatus(`Saved. ${categoryLabel(category)} for ${purposeLabel(purpose)} is now: ${levelLabel(level)}.`);
  }

  return (
    <>
      <PageTitle lede="Choose, for each kind of data and each purpose, what buyers may use. A change applies to the next query straight away, on every screen.">
        My consent
      </PageTitle>
      <FarmerPicker />

      <fieldset>
        <legend>Consent for {farmerId}</legend>
        <div className="table-wrap" role="region" aria-label="Consent settings table" tabIndex={0}>
          <table>
            <caption className="sr-only">
              Consent level for each kind of data and each purpose
            </caption>
            <thead>
              <tr>
                <th scope="col">Data</th>
                {PURPOSES.map((p) => (
                  <th scope="col" key={p.id}>{p.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DATA_CATEGORIES.map((c) => (
                <tr key={c.id}>
                  <th scope="row">{c.label}</th>
                  {PURPOSES.map((p) => {
                    const selectId = `consent-${c.id}-${p.id}`;
                    return (
                      <td key={p.id}>
                        <label htmlFor={selectId} className="sr-only">
                          {c.short} for {p.label}
                        </label>
                        <select
                          id={selectId}
                          value={getLevel(ledger, farmerId, c.id, p.id)}
                          onChange={(e) => onChange(c.id, p.id, e.target.value)}
                        >
                          {CONSENT_LEVELS.map((l) => (
                            <option key={l.id} value={l.id}>{l.label}</option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              withdrawAll(farmerId, 'web');
              setStatus('Saved. All consent withdrawn. No buyer can use any of this farmer\'s data.');
            }}
          >
            Withdraw all consent
          </button>
        </div>
        <p role="status" className="muted">{status}</p>
      </fieldset>

      <h2>What the levels mean</h2>
      <ul>
        <li><strong>No sharing.</strong> Your data is left out of every result for that purpose.</li>
        <li><strong>Aggregate results only.</strong> Your data may count toward a result that pools many farmers, and only if enough farmers are in the group.</li>
        <li><strong>Aggregate, including per-cooperative results.</strong> As above, and your data may also count toward results reported for your cooperative as a group.</li>
      </ul>
      <p className="muted">
        No level ever releases your individual record to a buyer.
      </p>

      <h2>Recent changes for this farmer</h2>
      {history.length === 0 ? (
        <p className="muted">No changes yet. Change a setting above, or use the feature phone.</p>
      ) : (
        <div className="table-wrap" role="region" aria-label="Recent consent changes" tabIndex={0}>
          <table>
            <caption className="sr-only">Most recent consent changes for this farmer</caption>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Data</th>
                <th scope="col">Purpose</th>
                <th scope="col">Change</th>
                <th scope="col">Channel</th>
              </tr>
            </thead>
            <tbody>
              {history.map((e) => (
                <tr key={e.seq}>
                  <td className="nowrap">{e.at ? new Date(e.at).toLocaleString('en-GB') : 'start'}</td>
                  <td>{categoryLabel(e.category)}</td>
                  <td>{purposeLabel(e.purpose)}</td>
                  <td>{levelLabel(e.from)} to {levelLabel(e.to)}</td>
                  <td>{channelLabel[e.channel] ?? e.channel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
