import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../src/App.jsx';
import { StoreProvider } from '../src/state/store.jsx';
import { ROLES, VIEWS } from '../src/views/viewConfig.js';

// Server-render every role and view once. This catches crashes in rendering code
// without a browser. It does not test interaction; the core logic has its own unit tests.

function render(role, view) {
  return renderToString(
    <StoreProvider persist={false} overrides={{ role, views: { farmer: 'overview', trust: 'overview', buyer: 'overview', [role]: view } }}>
      <App />
    </StoreProvider>,
  );
}

describe('render smoke test', () => {
  for (const role of ROLES) {
    for (const view of VIEWS[role.id]) {
      it(`renders ${role.id} / ${view.id} with the synthetic-data banner`, () => {
        const html = render(role.id, view.id);
        expect(html).toContain('Synthetic data, proof of concept');
        expect(html).toContain('<h1');
        expect(html).not.toMatch(/\u2014/); // no em dashes in rendered copy
      });
    }
  }
});

// Rendering with real query outcomes in state (released, refused, differencing).
import { BUYERS } from '../src/core/constants.js';
import { DATASET } from '../src/state/dataset.js';
import { createTrustState, submitQuery } from '../src/core/trustState.js';

function trustWithQueries() {
  let trust = createTrustState({ initialConsent: structuredClone(DATASET.initialConsent), seed: DATASET.meta.seed });
  const ctx = { dataset: DATASET, buyers: BUYERS };
  const base = { buyerId: 'buyer-a', purpose: 'supply_chain_planning', queryType: 'mean_yield', filter: {}, groupBy: null };
  const requests = [
    base,
    { ...base, filter: { zone: ['D3'] } },
    { ...base, buyerId: 'buyer-c', purpose: 'eudr_due_diligence' },
    { ...base, filter: { cooperative: ['coop-f'] } },
    { ...base, filter: { cooperative: ['coop-f'], ageBand: ['18-34', '35-44', '45-54', '55-64'] } },
  ];
  for (const r of requests) trust = submitQuery(trust, ctx, r, '2026-01-01T00:00:00.000Z').state;
  return trust;
}

describe('render with query outcomes', () => {
  const trust = trustWithQueries();
  it('shows the outcome and the check trail in the portal', () => {
    const html = renderToString(
      <StoreProvider persist={false} overrides={{ role: 'buyer', views: { farmer: 'overview', trust: 'overview', buyer: 'portal' }, trust, lastQueryId: 5, buyerId: 'buyer-a' }}>
        <App />
      </StoreProvider>,
    );
    expect(html).toContain('query refused');
    expect(html).toContain('Differencing risk');
    expect(html).toContain('Policy checks in order');
    expect(html).not.toMatch(/\u2014/);
  });
  it('lists only the selected buyer\'s queries in My queries', () => {
    const html = renderToString(
      <StoreProvider persist={false} overrides={{ role: 'buyer', views: { farmer: 'overview', trust: 'overview', buyer: 'history' }, trust, buyerId: 'buyer-c' }}>
        <App />
      </StoreProvider>,
    );
    expect(html).toContain('Purpose not permitted');
    expect(html).not.toContain('Differencing risk');
  });
  it('shows consenting-farmer counts and every outcome in the trust audit log', () => {
    const html = renderToString(
      <StoreProvider persist={false} overrides={{ role: 'trust', views: { farmer: 'overview', trust: 'audit', buyer: 'overview' }, trust }}>
        <App />
      </StoreProvider>,
    );
    expect(html).toContain('Consenting farmers matched');
    expect(html).toContain('Differencing risk');
    expect(html).toContain('Purpose not permitted');
    expect(html).toContain('Group too small');
    expect(html).not.toMatch(/\u2014/);
  });
  it('shows the running revenue ledger and farmer earnings once queries are released', () => {
    const html = renderToString(
      <StoreProvider persist={false} overrides={{ role: 'trust', views: { farmer: 'overview', trust: 'revenue', buyer: 'overview' }, trust }}>
        <App />
      </StoreProvider>,
    );
    expect(html).toContain('Running ledger');
    expect(html).toContain('Split used');
    expect(html).not.toContain('The ledger fills as buyers receive answers');
    const farmerHtml = renderToString(
      <StoreProvider persist={false} overrides={{ role: 'farmer', views: { farmer: 'earnings', trust: 'overview', buyer: 'overview' }, trust }}>
        <App />
      </StoreProvider>,
    );
    expect(farmerHtml).toContain('credited so far');
  });
});

import EvaluationView from '../src/components/Evaluation/EvaluationView.jsx';
import { runEvaluation } from '../src/core/evaluation/runner.js';

describe('evaluation screen', () => {
  it('shows the pass rate, per-family results and the known gaps after a run', () => {
    const html = renderToString(<EvaluationView initialReport={runEvaluation()} />);
    expect(html).toContain('25 of 25');
    expect(html).toContain('100.0%');
    expect(html).toContain('Known gap');
    expect(html).toContain('Threat model');
    expect(html).toContain('What a pass means');
    expect(html).not.toMatch(/\u2014/);
  });
  it('lists every case as not run before the button is pressed', () => {
    const html = renderToString(<EvaluationView />);
    expect(html).toContain('Not run');
    expect(html).not.toContain('25 of 25');
  });
});
