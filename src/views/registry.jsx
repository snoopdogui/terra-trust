import OverviewView from './OverviewView.jsx';
import DatasetView from '../components/Dataset/DatasetView.jsx';

// Maps "role:view" to a component. Features register their views here.
export const VIEW_COMPONENTS = {
  'farmer:overview': () => <OverviewView role="farmer" />,
  'trust:overview': () => <OverviewView role="trust" />,
  'trust:dataset': DatasetView,
  'buyer:overview': () => <OverviewView role="buyer" />,
};
