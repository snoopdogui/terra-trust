import OverviewView from './OverviewView.jsx';

// Maps "role:view" to a component. Features register their views here.
export const VIEW_COMPONENTS = {
  'farmer:overview': () => <OverviewView role="farmer" />,
  'trust:overview': () => <OverviewView role="trust" />,
  'buyer:overview': () => <OverviewView role="buyer" />,
};
