import OverviewView from './OverviewView.jsx';
import DatasetView from '../components/Dataset/DatasetView.jsx';
import FarmerConsentView from '../components/Consent/FarmerConsentView.jsx';
import BuyerPortal from '../components/Portal/BuyerPortal.jsx';
import BuyerHistory from '../components/Portal/BuyerHistory.jsx';
import AuditLog from '../components/Audit/AuditLog.jsx';
import UssdSimulator from '../components/Ussd/UssdSimulator.jsx';
import ConsentOverview from '../components/Consent/ConsentOverview.jsx';

// Maps "role:view" to a component. Features register their views here.
export const VIEW_COMPONENTS = {
  'farmer:overview': () => <OverviewView role="farmer" />,
  'trust:overview': () => <OverviewView role="trust" />,
  'farmer:consent': FarmerConsentView,
  'farmer:phone': UssdSimulator,
  'trust:dataset': DatasetView,
  'trust:consent': ConsentOverview,
  'trust:audit': AuditLog,
  'buyer:portal': BuyerPortal,
  'buyer:history': BuyerHistory,
  'buyer:overview': () => <OverviewView role="buyer" />,
};
