import Badge from '../ui/Badge.jsx';
import CheckTrail from './CheckTrail.jsx';
import { REASON_LABEL } from '../../core/policyEngine.js';
import { formatGhs, formatInt } from '../../core/format.js';

function ResultTable({ result }) {
  return (
    <div className="table-wrap" role="region" aria-label="Query result" tabIndex={0}>
      <table>
        <caption className="sr-only">Aggregate result</caption>
        <thead>
          <tr>
            {result.columns.map((c, i) => (
              <th scope="col" key={c} className={i > 0 ? 'num' : undefined}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) =>
                i === 0 ? (
                  <th scope="row" key={i}>{cell}</th>
                ) : (
                  <td key={i} className="num">{typeof cell === 'number' ? (Number.isInteger(cell) ? formatInt(cell) : cell) : cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Shows one audit entry as an outcome. `showInternal` adds details only trust staff may see. */
export default function QueryOutcome({ entry, headingRef, showInternal = false }) {
  const allowed = entry.decision === 'allow';
  return (
    <section aria-labelledby={`outcome-${entry.id}`}>
      <h2 id={`outcome-${entry.id}`} tabIndex={-1} ref={headingRef}>
        Query #{entry.id}: {allowed ? 'result released' : 'query refused'}{' '}
        <Badge tone={allowed ? 'ok' : 'bad'}>{REASON_LABEL[entry.code] ?? entry.code}</Badge>
      </h2>
      {allowed ? (
        <>
          <ResultTable result={entry.result} />
          <p className="muted">
            Aggregate over consenting farmers only. Fee for this answer: {formatGhs(entry.feePesewas)}.
          </p>
        </>
      ) : (
        <div className="callout callout-bad">
          <p><strong>Why it was refused.</strong> {entry.reason}</p>
        </div>
      )}
      <h3>How the policy engine decided</h3>
      <CheckTrail checks={entry.checks} />
      {showInternal && entry.cohortSize !== null ? (
        <p className="muted">Trust staff only: {entry.cohortSize} consenting farmers matched this query.</p>
      ) : null}
    </section>
  );
}
