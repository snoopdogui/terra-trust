import { useEffect, useRef } from 'react';
import Banner from './components/layout/Banner.jsx';
import RoleSwitcher from './components/layout/RoleSwitcher.jsx';
import Tabs from './components/layout/Tabs.jsx';
import { useStore } from './state/store.jsx';
import { ROLES, VIEWS } from './views/viewConfig.js';
import { VIEW_COMPONENTS } from './views/registry.jsx';

export default function App() {
  const { state, dispatch } = useStore();
  const items = VIEWS[state.role];
  const current = items.some((v) => v.id === state.views[state.role]) ? state.views[state.role] : items[0].id;
  const View = VIEW_COMPONENTS[`${state.role}:${current}`];
  const roleLabel = ROLES.find((r) => r.id === state.role).label;

  // Move focus to the new page title after the person navigates (not on first load).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.querySelector('main h1')?.focus();
  }, [state.role, current]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Banner />
      <header className="app-header">
        <div className="app-header-top">
          <p className="brand">
            Terra Trust <small>Agricultural data trust prototype</small>
          </p>
          <RoleSwitcher role={state.role} onChange={(role) => dispatch({ type: 'ui/role', role })} />
        </div>
        <Tabs
          label={`${roleLabel} sections`}
          items={items}
          current={current}
          onSelect={(view) => dispatch({ type: 'ui/view', view })}
        />
      </header>
      <main id="main">{View ? <View /> : null}</main>
      <footer className="footer">
        <p>
          Terra Trust is a research prototype built on synthetic data. Nothing here is real, deployed or legal advice.
        </p>
      </footer>
    </>
  );
}
