import { useEffect, useMemo, useState } from 'react';
import PageTitle from '../ui/PageTitle.jsx';
import Badge from '../ui/Badge.jsx';
import Stats from '../ui/Stats.jsx';
import { downloadText } from '../ui/download.js';
import { DATASET } from '../../state/dataset.js';
import { buildDataCard, CARD_FILE_NAME } from '../../core/dataCard.js';
import { CSV_FILE_NAME, datasetToCsv } from '../../core/datasetExport.js';
import { sha256Hex } from '../../core/hash.js';
import { buildScorecard, CARD_CHECK, CATEGORIES, STATUS_LABEL } from '../../core/readiness.js';

const TONE = { met: 'ok', partial: 'warn', 'not-met': 'bad', 'n/a': 'plain' };
const CSV = datasetToCsv(DATASET);

export default function ReadinessView({ initialHash = null }) {
  const [hash, setHash] = useState(initialHash);
  const [hashDone, setHashDone] = useState(Boolean(initialHash));

  useEffect(() => {
    if (initialHash) return undefined;
    let cancelled = false;
    sha256Hex(CSV).then((h) => {
      if (!cancelled) {
        setHash(h);
        setHashDone(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialHash]);

  const card = useMemo(() => buildDataCard(DATASET, { csvSha256: hash }), [hash]);
  const cardText = useMemo(() => `${JSON.stringify(card, null, 2)}\n`, [card]);
  const scorecard = useMemo(() => buildScorecard(DATASET, card), [card]);
  const { source, counts, total } = scorecard;

  return (
    <>
      <PageTitle lede="A self-assessment of this synthetic dataset against the criteria in the Open Data Institute's framework for AI-ready data. It is informed by the framework. It is not an implementation of it.">
        AI-readiness scorecard
      </PageTitle>

      <div className="callout callout-warn">
        <p>
          <strong>Read this first.</strong> The statuses below are this project's own assessment, not
          one made or endorsed by the ODI. The framework text this uses lists criteria and guidance
          but gives no scoring method, so no overall score is shown, only a status for each criterion
          and simple counts. The prototype does not claim to meet or implement the framework.
        </p>
        <p>
          Source: {source.publisher}, <a href={source.url}>{source.title}</a> (<a href={source.doi}>DOI</a>).
        </p>
      </div>

      <Stats
        label="Scorecard counts"
        items={[
          { value: counts.met, label: `met, of ${total} criteria` },
          { value: counts.partial, label: 'partly met' },
          { value: counts['not-met'], label: 'not met' },
          { value: counts['n/a'], label: 'not applicable' },
        ]}
      />

      {CATEGORIES.map((category) => {
        const rows = scorecard.items.filter((i) => i.category === category);
        return (
          <section key={category} aria-labelledby={`cat-${category.replace(/\s+/g, '-')}`}>
            <h2 id={`cat-${category.replace(/\s+/g, '-')}`}>{category}</h2>
            <div className="table-wrap" role="region" aria-label={`${category} criteria`} tabIndex={0}>
              <table>
                <caption className="sr-only">{category}: criterion, status and evidence</caption>
                <thead>
                  <tr>
                    <th scope="col">Criterion</th>
                    <th scope="col">Status</th>
                    <th scope="col">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((i) => (
                    <tr key={i.id}>
                      <th scope="row">
                        <span className="mono">{i.id}</span> {i.group ? `${i.group}: ` : ''}{i.name}
                      </th>
                      <td><Badge tone={TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge></td>
                      <td>{i.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <h2>Data card and dataset downloads</h2>
      <p>
        The data card is a JSON-LD file that describes the synthetic dataset using schema.org and
        MLCommons Croissant terms. It was checked with the {CARD_CHECK.library} reference library
        during development: {CARD_CHECK.errors} errors, and one warning ({CARD_CHECK.warnings}).
        The app does not run that check. To repeat it, follow the README.
      </p>
      <div className="btn-row">
        <button
          type="button"
          className="btn"
          disabled={!hashDone}
          onClick={() => downloadText(CARD_FILE_NAME, cardText, 'application/ld+json')}
        >
          Download data card (JSON-LD)
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => downloadText(CSV_FILE_NAME, CSV, 'text/csv')}>
          Download synthetic dataset (CSV)
        </button>
      </div>
      {hashDone && !hash ? (
        <p className="muted">
          This browser cannot compute a file hash here (Web Crypto needs a secure page), so the card
          is produced without its file description.
        </p>
      ) : null}
      <details>
        <summary>Preview the data card</summary>
        <pre className="table-wrap" tabIndex={0} aria-label="Data card JSON-LD preview" style={{ padding: '1rem', maxHeight: '28rem', overflow: 'auto', fontSize: '0.8rem' }}>
          {cardText}
        </pre>
      </details>
    </>
  );
}
