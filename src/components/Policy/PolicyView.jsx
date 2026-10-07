import { useState } from 'react';
import PageTitle from '../ui/PageTitle.jsx';
import { useActions, useStore } from '../../state/store.jsx';
import { BUYERS, DATA_CATEGORIES, DEFAULT_MIN_COHORT, MIN_COHORT_BOUNDS, PURPOSES, QUERY_TYPES } from '../../core/constants.js';
import { CHECKS } from '../../core/policyEngine.js';
import { purposeLabel } from '../../core/describe.js';

const categoryLabel = (id) => DATA_CATEGORIES.find((c) => c.id === id).short;

export default function PolicyView() {
  const { state } = useStore();
  const { setMinCohort } = useActions();
  const current = state.trust.config.minCohort;
  const [draft, setDraft] = useState(String(current));
  const n = Number(draft);
  const valid = draft.trim() !== '' && Number.isInteger(n) && n >= MIN_COHORT_BOUNDS.min && n <= MIN_COHORT_BOUNDS.max;

  return (
    <>
      <PageTitle lede="The rules the policy engine applies to every buyer query. The minimum group size can be changed here and applies to the next query.">
        Policy
      </PageTitle>

      <fieldset>
        <legend>Minimum group size</legend>
        <div className="field">
          <label htmlFor="min-cohort">Smallest number of consenting farmers behind any result</label>
          <input
            id="min-cohort"
            type="number"
            min={MIN_COHORT_BOUNDS.min}
            max={MIN_COHORT_BOUNDS.max}
            step="1"
            inputMode="numeric"
            value={draft}
            aria-describedby="min-cohort-hint"
            onChange={(e) => setDraft(e.target.value)}
            style={{ width: '7rem' }}
          />
          <span id="min-cohort-hint" className="hint">
            Whole number from {MIN_COHORT_BOUNDS.min} to {MIN_COHORT_BOUNDS.max}. The default is {DEFAULT_MIN_COHORT}.
          </span>
        </div>
        <p role={valid ? 'status' : 'alert'} className={valid ? 'muted' : undefined}>
          {valid
            ? `In use now: ${current}. ${n === current ? '' : `Press Apply to change it to ${n}.`}`
            : `Enter a whole number from ${MIN_COHORT_BOUNDS.min} to ${MIN_COHORT_BOUNDS.max}.`}
        </p>
        <div className="btn-row">
          <button type="button" className="btn" disabled={!valid || n === current} onClick={() => setMinCohort(n)}>
            Apply
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={current === DEFAULT_MIN_COHORT && draft === String(DEFAULT_MIN_COHORT)}
            onClick={() => {
              setDraft(String(DEFAULT_MIN_COHORT));
              setMinCohort(DEFAULT_MIN_COHORT);
            }}
          >
            Reset to {DEFAULT_MIN_COHORT}
          </button>
        </div>
        <p className="muted">
          There is no universal safe threshold. {DEFAULT_MIN_COHORT} is a default chosen for this
          prototype, not a standard, and small values give weak protection. The same number is used
          by the differencing check: a new answer must differ from an earlier one by zero farmers or
          by at least this many.
        </p>
      </fieldset>

      <h2>Checks, in the order they run</h2>
      <ol>
        {CHECKS.map((c) => (
          <li key={c.id}>{c.label}</li>
        ))}
      </ol>
      <p className="muted">The first failed check ends the query and its reason is returned and logged.</p>

      <h2>What each question may be used for</h2>
      <div className="table-wrap" role="region" aria-label="Question and purpose rules" tabIndex={0}>
        <table>
          <caption className="sr-only">Each question, the data it uses and the purposes it is permitted for</caption>
          <thead>
            <tr>
              <th scope="col">Question</th>
              <th scope="col">Data used</th>
              <th scope="col">Permitted purposes</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(QUERY_TYPES).map((t) => (
              <tr key={t.id}>
                <th scope="row">{t.label}</th>
                <td>{t.categories.map(categoryLabel).join(', ')}</td>
                <td>{t.purposes.map(purposeLabel).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Buyers and approved purposes</h2>
      <div className="table-wrap" role="region" aria-label="Buyer registry" tabIndex={0}>
        <table>
          <caption className="sr-only">Synthetic buyers and the purposes they are approved for</caption>
          <thead>
            <tr>
              <th scope="col">Buyer</th>
              <th scope="col">Kind</th>
              {PURPOSES.map((p) => (
                <th scope="col" key={p.id}>{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BUYERS.map((b) => (
              <tr key={b.id}>
                <th scope="row">{b.name}</th>
                <td>{b.kind}</td>
                {PURPOSES.map((p) => (
                  <td key={p.id}>{b.purposes.includes(p.id) ? 'Approved' : 'Not approved'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">These buyers are invented. Approving a real buyer would need a legal agreement and due diligence that this prototype does not model.</p>
    </>
  );
}
