import { useRef, useState } from 'react';
import PageTitle from '../ui/PageTitle.jsx';
import Badge from '../ui/Badge.jsx';
import Stats from '../ui/Stats.jsx';
import { CASES } from '../../core/evaluation/cases.js';
import { runEvaluation } from '../../core/evaluation/runner.js';
import { THREAT_MODEL } from '../../core/threatModel.js';
import { REASON_LABEL } from '../../core/policyEngine.js';
import { formatPercent } from '../../core/format.js';

const STATUS = {
  pass: { tone: 'ok', text: 'Pass' },
  fail: { tone: 'bad', text: 'Fail' },
  'known-gap': { tone: 'warn', text: 'Known gap' },
  'gap-closed': { tone: 'info', text: 'Gap now closed' },
  'not-run': { tone: 'plain', text: 'Not run' },
};

const outcomeText = (o) => `${o.decision === 'allow' ? 'released' : 'refused'}${o.code && o.decision === 'refuse' ? ` (${REASON_LABEL[o.code] ?? o.code})` : ''}`;

export default function EvaluationView({ initialReport = null }) {
  const [report, setReport] = useState(initialReport);
  const summaryRef = useRef(null);
  const byId = report ? Object.fromEntries(report.results.map((r) => [r.id, r])) : {};
  const scoredTotal = CASES.filter((c) => !c.knownGap).length;
  const gapTotal = CASES.length - scoredTotal;

  function run() {
    setReport(runEvaluation());
    setTimeout(() => summaryRef.current?.focus(), 0);
  }

  return (
    <>
      <PageTitle lede={`${CASES.length} adversarial test queries, each with an expected outcome. They run against the same policy engine the buyer portal uses.`}>
        Evaluation
      </PageTitle>

      <h2>Threat model</h2>
      <p>{THREAT_MODEL.summary}</p>
      <dl>
        {THREAT_MODEL.adversaries.map((a) => (
          <div key={a.name} className="panel">
            <dt><strong>{a.name}</strong></dt>
            <dd>
              <p><strong>Tries to:</strong> {a.goal}</p>
              <p><strong>Prototype response:</strong> {a.defence}</p>
            </dd>
          </div>
        ))}
      </dl>
      <h3>Assumptions</h3>
      <ul>{THREAT_MODEL.assumptions.map((t) => <li key={t}>{t}</li>)}</ul>
      <h3>Out of scope, and known gaps</h3>
      <ul>{THREAT_MODEL.outOfScope.map((t) => <li key={t}>{t}</li>)}</ul>

      <h2>Run the evaluation</h2>
      <ul>
        <li>Each case starts from a fresh copy of a small hand-built fixture, so group sizes are exact and the result does not depend on random data or on what you did in the other views.</li>
        <li>A case is a short sequence: queries, plus consent changes made between them. Each query has an expected outcome written from the threat model.</li>
        <li>{scoredTotal} cases are scored. {gapTotal} describe attacks the prototype does not stop. They are shown separately and are not in the pass rate.</li>
        <li>The same cases run as unit tests with <code>npm test</code>.</li>
      </ul>
      <div className="btn-row">
        <button type="button" className="btn" onClick={run}>Run evaluation</button>
      </div>

      <div aria-live="polite">
        {report ? (
          <section aria-labelledby="eval-summary">
            <h2 id="eval-summary" tabIndex={-1} ref={summaryRef}>Results</h2>
            <Stats
              label="Evaluation summary"
              items={[
                { value: `${report.summary.passed} of ${report.summary.scored}`, label: 'scored cases passed' },
                { value: formatPercent(report.summary.passRate), label: 'pass rate' },
                { value: report.summary.failed, label: 'failed' },
                { value: report.summary.knownGaps, label: 'known gaps (not scored)' },
              ]}
            />
            <div className="table-wrap" role="region" aria-label="Results by attack family" tabIndex={0}>
              <table>
                <caption className="sr-only">Pass counts by attack family</caption>
                <thead>
                  <tr>
                    <th scope="col">Attack family</th>
                    <th scope="col" className="num">Passed</th>
                    <th scope="col" className="num">Cases</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.summary.byCategory).map(([name, v]) => (
                    <tr key={name}>
                      <th scope="row">{name}</th>
                      <td className="num">{v.passed}</td>
                      <td className="num">{v.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>

      <h2>Cases</h2>
      <div className="table-wrap" role="region" aria-label="Evaluation cases" tabIndex={0}>
        <table>
          <caption className="sr-only">Evaluation cases and results</caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Attack family</th>
              <th scope="col">Case</th>
              <th scope="col">Result</th>
              <th scope="col">Steps</th>
            </tr>
          </thead>
          <tbody>
            {CASES.map((c) => {
              const r = byId[c.id];
              const st = STATUS[r ? r.status : 'not-run'];
              return (
                <tr key={c.id}>
                  <th scope="row" className="mono">{c.id}</th>
                  <td>{c.category}{c.control ? ' (control)' : ''}</td>
                  <td>{c.title}</td>
                  <td><Badge tone={st.tone}>{st.text}</Badge></td>
                  <td>
                    <details>
                      <summary>Show</summary>
                      <p><strong>Attempt:</strong> {c.attack}</p>
                      {c.why ? <p><strong>Why it is not stopped:</strong> {c.why}</p> : null}
                      <ol>
                        {(r ? r.steps : c.steps.map((s, i) => ({ index: i, kind: s.op === 'query' ? 'query' : 'setup', text: s.op === 'query' ? 'Query' : s.note, expected: s.expect }))).map((s) => (
                          <li key={s.index}>
                            {s.kind === 'setup' ? (
                              <>Setup: {s.text}</>
                            ) : (
                              <>
                                Query: {s.text}.<br />
                                Expected: {outcomeText(s.expected)}.
                                {s.actual ? <> Got: {outcomeText(s.actual)}. <Badge tone={s.pass ? 'ok' : 'bad'}>{s.pass ? 'Matches' : 'Differs'}</Badge></> : null}
                              </>
                            )}
                          </li>
                        ))}
                      </ol>
                    </details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="callout callout-warn">
        <p>
          <strong>What a pass means.</strong> The cases were written by the same author as the engine,
          from the threat model above. A pass shows the engine does what its author intended on these
          cases and will catch regressions. It is not evidence that the controls are secure against a
          determined attacker.
        </p>
      </div>
    </>
  );
}
