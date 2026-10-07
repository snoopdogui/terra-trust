import { describe, expect, it } from 'vitest';
import { defaultState, reducer } from '../src/state/store.jsx';
import { getLevel } from '../src/core/consentLedger.js';

describe('store reducer', () => {
  it('applies a web consent change to the shared ledger', () => {
    const s0 = defaultState();
    const id = s0.farmerId;
    const s1 = reducer(s0, {
      type: 'consent/set',
      at: 'now',
      change: { farmerId: id, category: 'yield', purpose: 'eudr_due_diligence', level: 'cooperative', channel: 'web' },
    });
    expect(getLevel(s1.trust.ledger, id, 'yield', 'eudr_due_diligence')).toBe('cooperative');
    expect(getLevel(s0.trust.ledger, id, 'yield', 'eudr_due_diligence')).not.toBe('cooperative');
  });

  it('withdraws everything for a farmer and resets cleanly', () => {
    const s0 = defaultState();
    const s1 = reducer(s0, { type: 'consent/withdrawAll', farmerId: s0.farmerId, channel: 'ussd', at: 'now' });
    expect(getLevel(s1.trust.ledger, s0.farmerId, 'price', 'price_benchmarking')).toBe('none');
    const s2 = reducer(s1, { type: 'app/reset' });
    expect(s2.trust.ledger.events).toHaveLength(0);
  });

  it('keeps each role on its own view', () => {
    const s1 = reducer(defaultState(), { type: 'ui/view', view: 'consent' });
    expect(s1.views.farmer).toBe('consent');
    const s2 = reducer(s1, { type: 'ui/role', role: 'trust' });
    expect(s2.views.trust).toBe('overview');
  });
});
