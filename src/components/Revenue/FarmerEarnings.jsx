import PageTitle from '../ui/PageTitle.jsx';
import Stats from '../ui/Stats.jsx';
import FarmerPicker from '../Consent/FarmerPicker.jsx';
import { useStore } from '../../state/store.jsx';
import { formatGhs } from '../../core/format.js';

export default function FarmerEarnings() {
  const { state } = useStore();
  const { revenue } = state.trust;
  const id = state.farmerId;
  const balance = revenue.farmerBalances[id] ?? 0;
  const counted = revenue.farmerContributions[id] ?? 0;
  return (
    <>
      <PageTitle lede="When a buyer's query is answered, the farmers whose data counted share a part of the fee. This shows that share for one synthetic farmer. The amounts are illustrative and no real money is paid.">
        My earnings
      </PageTitle>
      <FarmerPicker />
      <Stats
        label="Earnings for the selected farmer"
        items={[
          { value: formatGhs(balance), label: 'credited so far (synthetic)' },
          { value: counted, label: 'answers this farmer\'s data counted toward' },
          { value: `${revenue.split.farmers}%`, label: 'of each fee goes to farmers' },
        ]}
      />
      {counted === 0 ? (
        <div className="callout">
          <p>
            Nothing credited yet. A farmer earns only when their data counts toward an answer, which
            needs their consent for that purpose. Run queries in the Buyer view, or change this
            farmer's consent, and check back.
          </p>
        </div>
      ) : null}
      <p>
        Within one answer every counted farmer receives the same share. Farmers who did not consent,
        or whose group was too small to answer, receive nothing for that query.
      </p>
    </>
  );
}
