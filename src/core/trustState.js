// The trust's whole mutable state in one plain object, so it can be saved, reset and tested.
// The UI store and the evaluation harness both drive it through these functions.

import { DEFAULT_MIN_COHORT } from './constants.js';
import { createLedger, setConsent as ledgerSetConsent, withdrawAll as ledgerWithdrawAll } from './consentLedger.js';

export const TRUST_STATE_VERSION = 1;

export function createTrustState({ initialConsent, seed = null, config = {} }) {
  return {
    version: TRUST_STATE_VERSION,
    seed,
    config: { minCohort: DEFAULT_MIN_COHORT, ...config },
    ledger: createLedger(initialConsent),
  };
}

export function setConsent(state, change) {
  const ledger = ledgerSetConsent(state.ledger, change);
  return ledger === state.ledger ? state : { ...state, ledger };
}

export function withdrawAllConsent(state, args) {
  const ledger = ledgerWithdrawAll(state.ledger, args);
  return ledger === state.ledger ? state : { ...state, ledger };
}

/** Light shape check used when loading saved state. */
export function isUsableTrustState(state, { seed, farmerCount }) {
  return Boolean(
    state &&
      state.version === TRUST_STATE_VERSION &&
      state.seed === seed &&
      state.ledger &&
      state.ledger.effective &&
      Object.keys(state.ledger.effective).length === farmerCount,
  );
}
