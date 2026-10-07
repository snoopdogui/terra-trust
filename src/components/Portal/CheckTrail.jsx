// The policy engine's checks, in order, with what happened at each step.
const MARK = { pass: '\u2713', fail: '\u2715', skipped: '\u25CB' };
const STATE_TEXT = { pass: 'Passed', fail: 'Failed', skipped: 'Not reached' };

export default function CheckTrail({ checks }) {
  return (
    <ol className="trail" aria-label="Policy checks in order">
      {checks.map((c) => (
        <li key={c.id} className={`trail-${c.status}`}>
          <span className="trail-mark" aria-hidden="true">{MARK[c.status]}</span>
          <span>
            <span className="trail-label">{c.label}</span>
            <span className="trail-state">{STATE_TEXT[c.status]}</span>
            {c.status === 'fail' && c.detail ? <span className="trail-detail">{c.detail}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
