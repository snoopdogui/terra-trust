import { useEffect, useState } from 'react';
import PageTitle from '../ui/PageTitle.jsx';
import FarmerPicker from '../Consent/FarmerPicker.jsx';
import { useActions, useStore } from '../../state/store.jsx';
import { render, startSession, step, USSD_MAX_CHARS } from '../../core/ussd.js';

export default function UssdSimulator() {
  const { state } = useStore();
  const { setConsent, withdrawAll } = useActions();
  const [session, setSession] = useState(null);
  const [reply, setReply] = useState('');
  const farmerId = state.farmerId;
  const { ledger } = state.trust;

  // A different farmer means a different phone: end any open session.
  useEffect(() => {
    setSession(null);
    setReply('');
  }, [farmerId]);

  const text = session ? render(session, ledger) : '';
  const ended = session && session.screen === 'ended';

  function send(e) {
    e.preventDefault();
    if (!session || ended) return;
    const result = step(session, ledger, reply);
    for (const effect of result.effects) {
      if (effect.type === 'setConsent') setConsent(effect.change);
      if (effect.type === 'withdrawAll') withdrawAll(effect.farmerId, effect.channel);
    }
    setSession(result.session);
    setReply('');
  }

  return (
    <>
      <PageTitle lede="Many farmers use a basic phone, not a smartphone. This simulates a USSD menu: numbered choices, no apps, no internet. It changes the same consent ledger as the web form.">
        Feature phone (USSD)
      </PageTitle>
      <FarmerPicker />

      <div className="split">
        <div>
          <div className="phone">
            {session ? (
              <pre className="phone-screen" role="status" aria-label="Phone screen">{text}</pre>
            ) : (
              <p className="phone-screen phone-idle">Ready. Start a session to open the menu.</p>
            )}
            {session ? (
              <p className="phone-meta">{text.length} of {USSD_MAX_CHARS} characters</p>
            ) : null}
          </div>

          {!session || ended ? (
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setSession(startSession(farmerId));
                  setReply('');
                }}
              >
                {ended ? 'Start a new session' : 'Start USSD session'}
              </button>
            </div>
          ) : (
            <form onSubmit={send}>
              <div className="field">
                <label htmlFor="ussd-reply">Your reply</label>
                <input
                  id="ussd-reply"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <span className="hint">Type the number of a menu choice, then send.</span>
              </div>
              <div className="btn-row">
                <button type="submit" className="btn">Send reply</button>
                <button type="button" className="btn btn-secondary" onClick={() => setSession(null)}>
                  End session
                </button>
              </div>
            </form>
          )}
        </div>

        <div>
          <h2 style={{ marginTop: 0 }}>How it works here</h2>
          <ul>
            <li>The menu is a pure function in <code>src/core/ussd.js</code>. It returns what to show and which consent changes to make.</li>
            <li>Every change is written to the same ledger as the web form, and is tagged as coming from USSD.</li>
            <li>Each screen stays under {USSD_MAX_CHARS} characters. Real networks differ, so check the limit for any operator before relying on it.</li>
            <li>Open <strong>My consent</strong> to see a change made here, or switch to the Cooperative and Trust view to see it in the ledger.</li>
          </ul>
          <p className="muted">
            This is a simulation of the menu logic only. It is not connected to any phone network or
            USSD gateway, and no real phone numbers are involved.
          </p>
        </div>
      </div>
    </>
  );
}
