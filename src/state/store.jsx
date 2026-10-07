import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { BUYERS, STORAGE_KEY } from '../core/constants.js';
import {
  createTrustState,
  isUsableTrustState,
  setConsent,
  setMinCohort,
  submitQuery,
  withdrawAllConsent,
} from '../core/trustState.js';
import { DATASET } from './dataset.js';

// One store drives every view. Consent changes made on the web, on the simulated feature
// phone or anywhere else go through the same reducer, so every view sees them at once.

const StoreContext = createContext(null);

const STORE_VERSION = 3;
const FIRST_FARMER = DATASET.farmers[0].id;

function freshTrust() {
  return createTrustState({ initialConsent: DATASET.initialConsent, seed: DATASET.meta.seed });
}

export function defaultState() {
  return {
    role: 'farmer',
    views: { farmer: 'overview', trust: 'overview', buyer: 'overview' },
    farmerId: FIRST_FARMER,
    buyerId: BUYERS[0].id,
    lastQueryId: null,
    trust: freshTrust(),
  };
}

function loadPersisted() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.version === STORE_VERSION ? data.state : null;
  } catch {
    return null;
  }
}

function init({ persist, overrides }) {
  const base = defaultState();
  const saved = persist ? loadPersisted() : null;
  const merged = { ...base };
  if (saved) {
    if (saved.role) merged.role = saved.role;
    if (saved.views) merged.views = { ...base.views, ...saved.views };
    if (saved.farmerId && DATASET.farmers.some((f) => f.id === saved.farmerId)) merged.farmerId = saved.farmerId;
    if (saved.buyerId && BUYERS.some((b) => b.id === saved.buyerId)) merged.buyerId = saved.buyerId;
    if (isUsableTrustState(saved.trust, { seed: DATASET.meta.seed, farmerCount: DATASET.farmers.length })) {
      merged.trust = saved.trust;
      merged.lastQueryId = saved.lastQueryId ?? null;
    }
  }
  return { ...merged, ...(overrides || {}) };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'ui/role':
      return { ...state, role: action.role };
    case 'ui/view':
      return { ...state, views: { ...state.views, [state.role]: action.view } };
    case 'ui/farmer':
      return { ...state, farmerId: action.farmerId };
    case 'ui/buyer':
      return { ...state, buyerId: action.buyerId };
    case 'query/submit': {
      const { state: trust, entry } = submitQuery(state.trust, { dataset: DATASET, buyers: BUYERS }, action.request, action.at);
      return { ...state, trust, lastQueryId: entry.id };
    }
    case 'policy/minCohort':
      return { ...state, trust: setMinCohort(state.trust, action.value) };
    case 'consent/set':
      return { ...state, trust: setConsent(state.trust, { ...action.change, at: action.at }) };
    case 'consent/withdrawAll':
      return { ...state, trust: withdrawAllConsent(state.trust, { farmerId: action.farmerId, channel: action.channel, at: action.at }) };
    case 'app/reset':
      return defaultState();
    default:
      return state;
  }
}

export function StoreProvider({ children, persist = true, overrides }) {
  const [state, dispatch] = useReducer(reducer, { persist, overrides }, init);

  useEffect(() => {
    if (!persist || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORE_VERSION, state }));
    } catch {
      // Storage can be full or blocked. The prototype keeps working in memory.
    }
  }, [state, persist]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

/** Action helpers so components do not build action objects by hand. */
export function useActions() {
  const { dispatch } = useStore();
  return useMemo(
    () => ({
      setRole: (role) => dispatch({ type: 'ui/role', role }),
      setView: (view) => dispatch({ type: 'ui/view', view }),
      selectFarmer: (farmerId) => dispatch({ type: 'ui/farmer', farmerId }),
      selectBuyer: (buyerId) => dispatch({ type: 'ui/buyer', buyerId }),
      submitQuery: (request) => dispatch({ type: 'query/submit', request, at: new Date().toISOString() }),
      setMinCohort: (value) => dispatch({ type: 'policy/minCohort', value }),
      setConsent: (change) => dispatch({ type: 'consent/set', change, at: new Date().toISOString() }),
      withdrawAll: (farmerId, channel = 'web') =>
        dispatch({ type: 'consent/withdrawAll', farmerId, channel, at: new Date().toISOString() }),
      resetAll: () => dispatch({ type: 'app/reset' }),
    }),
    [dispatch],
  );
}
