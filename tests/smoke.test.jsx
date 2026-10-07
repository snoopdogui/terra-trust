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
