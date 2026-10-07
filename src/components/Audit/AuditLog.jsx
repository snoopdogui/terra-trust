import { useMemo, useState } from 'react';
import PageTitle from '../ui/PageTitle.jsx';
import Badge from '../ui/Badge.jsx';
import Stats from '../ui/Stats.jsx';
import CheckTrail from '../Portal/CheckTrail.jsx';
import { useStore } from '../../state/store.jsx';
import { COOP_NAME } from '../../state/dataset.js';
import { BUYERS, PURPOSES } from '../../core/constants.js';
import { EMPTY_CRITERIA, filterAudit, summariseAudit } from '../../core/auditLog.js';
import { describeFilter, purposeLabel, queryTypeLabel } from '../../core/describe.js';
import { REASON, REASON_LABEL } from '../../core/policyEngine.js';
import { formatGhs } from '../../core/format.js';

const PAGE_SIZE = 20;
const nameFor = (dim, value) => (dim === 'cooperative' ? COOP_NAME[value] ?? value : value);
const buyerName = (id) => BUYERS.find((b) => b.id === id)?.name ?? String(id);

export default function AuditLog() {
  const { state } = useStore();
  const audit = state.trust.audit;
  const [criteria, setCriteria] = useState(EMPTY_CRITERIA);
  const [page, setPage] = useState(0);

  const rows = useMemo(() => filterAudit(audit, criteria, nameFor), [audit, criteria]);
  const summary = useMemo(() => summariseAudit(audit), [audit]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const update = (patch) => {
    setCriteria((c) => ({ ...c, ...patch }));
    setPage(0);
  };

  return (
    <>
      <PageTitle lede="Every buyer query, whatever the outcome, with the reason. Cooperative and trust staff also see how many consenting farmers matched. Buyers never see that number.">
        Audit log
      </PageTitle>

      <Stats
        label="Audit summary"
        items={[
          { value: summary.total, label: 'queries logged' },
          { value: summary.released, label: 'released' },
          { value: summary.refused, label: 'refused' },
          { value: summary.byCode[REASON.DIFFERENCING_RISK] ?? 0, label: 'refused for differencing risk' },
        ]}
      />

      {audit.length === 0 ? (
        <div className="callout">
          <p>No queries yet. Open the Buyer view, run a query from the query portal, then return here.</p>
        </div>
      ) : null}

      <fieldset>
        <legend>Filter the log</legend>
        <div className="row">
          <div className="field">
            <label htmlFor="audit-decision">Outcome</label>
            <select id="audit-decision" value={criteria.decision} onChange={(e) => update({ decision: e.target.value })}>
              <option value="all">All outcomes</option>
              <option value="allow">Released</option>
              <option value="refuse">Refused</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="audit-code">Reason</label>
            <select id="audit-code" value={criteria.code} onChange={(e) => update({ code: e.target.value })}>
              <option value="all">All reasons</option>
              {Object.entries(REASON_LABEL).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="audit-buyer">Buyer</label>
            <select id="audit-buyer" value={criteria.buyerId} onChange={(e) => update({ buyerId: e.target.value })}>
              <option value="all">All buyers</option>
              {BUYERS.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="audit-purpose">Purpose</label>
            <select id="audit-purpose" value={criteria.purpose} onChange={(e) => update({ purpose: e.target.value })}>
              <option value="all">All purposes</option>
              {PURPOSES.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="audit-text">Search</label>
            <input id="audit-text" type="search" value={criteria.text} onChange={(e) => update({ text: e.target.value })} />
          </div>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={() => update(EMPTY_CRITERIA)}>Clear filters</button>
        </div>
        <p role="status" className="muted">Showing {rows.length} of {audit.length} queries.</p>
      </fieldset>

      {visible.length > 0 ? (
        <>
          <div className="table-wrap" role="region" aria-label="Audit log table" tabIndex={0}>
            <table>
              <caption className="sr-only">Audit log of buyer queries, newest first</caption>
              <thead>
                <tr>
                  <th scope="col" className="num">#</th>
                  <th scope="col">Time</th>
                  <th scope="col">Buyer</th>
                  <th scope="col">Purpose and question</th>
                  <th scope="col">Selection</th>
                  <th scope="col">Outcome</th>
                  <th scope="col" className="num">Consenting farmers matched</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => (
                  <tr key={e.id}>
                    <td className="num">{e.id}</td>
                    <td className="nowrap">{e.at ? new Date(e.at).toLocaleString('en-GB') : ''}</td>
                    <td>{buyerName(e.buyerId)}</td>
                    <td>
                      {purposeLabel(e.purpose)}
                      <div className="muted">{queryTypeLabel(e.queryType)}{e.groupBy ? ', per cooperative' : ''}</div>
                    </td>
                    <td>{describeFilter(e.filter, nameFor)}</td>
                    <td>
                      <Badge tone={e.decision === 'allow' ? 'ok' : 'bad'}>{REASON_LABEL[e.code] ?? e.code}</Badge>
                    </td>
                    <td className="num">{e.cohortSize ?? 'n/a'}</td>
                    <td>
                      <details>
                        <summary>Why</summary>
                        <p>{e.reason}</p>
                        <p className="muted">Minimum group size then: {e.minCohort}.{e.decision === 'allow' ? ` Fee: ${formatGhs(e.feePesewas)}.` : ''}</p>
                        <CheckTrail checks={e.checks} />
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button type="button" className="btn btn-secondary" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Newer</button>
            <span>Page {safePage + 1} of {pages}</span>
            <button type="button" className="btn btn-secondary" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>Older</button>
          </div>
        </>
      ) : audit.length > 0 ? (
        <p className="muted">No queries match these filters.</p>
      ) : null}
    </>
  );
}
