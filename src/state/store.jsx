import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { STORAGE_KEY } from '../core/constants.js';

const StoreContext = createContext(null);

const STORE_VERSION = 1;

function defaultState() {
  return {
    role: 'farmer',
    views: { farmer: 'overview', trust: 'overview', buyer: 'overview' },
  };
}

function loadPersisted() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.version === STORE_VERSION ? data : null;
  } catch {
    return null;
  }
}

function init({ persist, overrides }) {
  const saved = persist ? loadPersisted() : null;
  return { ...defaultState(), ...(saved ? saved.state : {}), ...(overrides || {}) };
}

function reducer(state, action) {
  switch (action.type) {
    case 'ui/role':
      return { ...state, role: action.role };
    case 'ui/view':
      return { ...state, views: { ...state.views, [state.role]: action.view } };
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
