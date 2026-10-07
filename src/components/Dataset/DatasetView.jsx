import { useState } from 'react';
import PageTitle from '../ui/PageTitle.jsx';
import Stats from '../ui/Stats.jsx';
import { DATASET, SUMMARY, COOP_NAME } from '../../state/dataset.js';
import { formatInt, formatOne, formatPercent, formatTwo } from '../../core/format.js';

const PAGE_SIZE = 20;

export default function DatasetView() {
  const [coop, setCoop] = useState('all');
  const [page, setPage] = useState(0);
  const rows = coop === 'all' ? DATASET.farmers : DATASET.farmers.filter((f) => f.cooperativeId === coop);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const start = safePage * PAGE_SIZE;
  const visible = rows.slice(start, start + PAGE_SIZE);

  return (
    <>
      <PageTitle lede={`${formatInt(SUMMARY.rows)} invented farmers in ${SUMMARY.cooperatives} invented cooperatives. The data is generated in your browser from a fixed seed, so anyone running this code sees the same records.`}>
        Synthetic dataset
      </PageTitle>

      <Stats
        label="Dataset summary"
        items={[
          { value: formatInt(SUMMARY.rows), label: 'synthetic farmers' },
          { value: SUMMARY.cooperatives, label: 'cooperatives' },
          { value: SUMMARY.zones, label: 'coarse zones' },
          { value: SUMMARY.smallestZone, label: 'farmers in smallest zone' },
          { value: DATASET.meta.seed, label: 'random seed' },
        ]}
      />

      <div className="callout">
        <p>
          <strong>How this data was made.</strong> A seeded random generator invents every value.
          Yield and price are not calibrated to any real market or survey. Exact ages and plot sizes
          are used only to assign bands and are then discarded. Consent settings are assigned by the
          generator, not by real people.
        </p>
      </div>

      <h2>Cooperatives</h2>
      <div className="table-wrap" role="region" aria-label="Cooperatives table" tabIndex={0}>
        <table>
          <caption className="sr-only">Synthetic cooperatives and their summary statistics</caption>
          <thead>
            <tr>
              <th scope="col">Cooperative</th>
              <th scope="col" className="num">Zones</th>
              <th scope="col" className="num">Farmers</th>
              <th scope="col" className="num">Share of all farmers</th>
              <th scope="col" className="num">Mean yield (kg/ha)</th>
              <th scope="col" className="num">Mean price (GHS/kg)</th>
            </tr>
          </thead>
          <tbody>
            {SUMMARY.perCooperative.map((c) => (
              <tr key={c.id}>
                <th scope="row">{c.name}</th>
                <td className="num">{c.zones}</td>
                <td className="num">{c.farmers}</td>
                <td className="num">{formatPercent(c.share)}</td>
                <td className="num">{formatOne(c.meanYield)}</td>
                <td className="num">{formatTwo(c.meanPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Farmer records</h2>
      <p>
        Cooperative and trust staff can see individual synthetic records. Buyers never can: the
        query portal returns aggregates only.
      </p>
      <div className="field">
        <label htmlFor="coop-filter">Cooperative</label>
        <select
          id="coop-filter"
          value={coop}
          onChange={(e) => {
            setCoop(e.target.value);
            setPage(0);
          }}
        >
          <option value="all">All cooperatives</option>
          {DATASET.cooperatives.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="table-wrap" role="region" aria-label="Farmer records table" tabIndex={0}>
        <table>
          <caption className="sr-only">Synthetic farmer records</caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Cooperative</th>
              <th scope="col">Zone</th>
              <th scope="col">Age band</th>
              <th scope="col">Gender</th>
              <th scope="col">Plot size</th>
              <th scope="col">Variety</th>
              <th scope="col" className="num">Yield (kg/ha)</th>
              <th scope="col" className="num">Price (GHS/kg)</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((f) => (
              <tr key={f.id}>
                <th scope="row" className="mono">{f.id}</th>
                <td>{COOP_NAME[f.cooperativeId]}</td>
                <td>{f.zoneId}</td>
                <td>{f.ageBand}</td>
                <td>{f.gender}</td>
                <td>{f.plotSizeBand}</td>
                <td>{f.variety}</td>
                <td className="num">{f.yieldKgHa}</td>
                <td className="num">{formatTwo(f.priceGhsPerKg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <button type="button" className="btn btn-secondary" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
          Previous page
        </button>
        <span aria-live="polite">
          Showing {start + 1} to {Math.min(start + PAGE_SIZE, rows.length)} of {rows.length}
        </span>
        <button type="button" className="btn btn-secondary" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>
          Next page
        </button>
      </div>
    </>
  );
}
