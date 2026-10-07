import PageTitle from '../components/ui/PageTitle.jsx';

const ROLE_TEXT = {
  farmer: {
    heading: 'Farmer view',
    body: 'A farmer decides which kinds of data may be used, for which purposes, and at what level of detail. The same choices can be made on a feature phone.',
  },
  trust: {
    heading: 'Cooperative and Trust view',
    body: 'Cooperative and trust staff see the dataset, the consent ledger, the audit log of every buyer query, the revenue split, the policy settings and the evaluation of the policy engine.',
  },
  buyer: {
    heading: 'Buyer view',
    body: 'A buyer chooses a purpose and a question and receives aggregate results only. The policy engine refuses a query and explains why when the purpose, consent or group size does not allow it.',
  },
};

export default function OverviewView({ role }) {
  const text = ROLE_TEXT[role];
  return (
    <>
      <PageTitle lede="A proof of concept for governing who can use farm data, for what, and with whose consent. It runs entirely in your browser on synthetic data.">
        Terra Trust
      </PageTitle>

      <h2>{text.heading}</h2>
      <p>{text.body}</p>

      <h2>What this is</h2>
      <p>
        A small research prototype that explores how three layers could fit together for cocoa
        cooperatives: farmer cooperatives as first-mile stewards, a fiduciary data trust that sets
        and enforces policy, and a buyer-facing query portal that only releases aggregates. The EU
        Deforestation Regulation (EUDR) is the motivating context.
      </p>

      <h2>What this is not</h2>
      <ul>
        <li>It is not deployed, and it has no real users, farmers, cooperatives or buyers.</li>
        <li>All data is synthetic, generated from a fixed random seed so results can be reproduced.</li>
        <li>It does not demonstrate or claim compliance with the EUDR or any other law.</li>
        <li>The role switcher is a demonstration aid. There is no login or access control.</li>
      </ul>

      <h2>The three layers</h2>
      <div className="split">
        <div className="panel">
          <h3>Farmer cooperatives</h3>
          <p>First-mile stewards. Farmers hold consent for each kind of data and each purpose.</p>
        </div>
        <div className="panel">
          <h3>Data trust</h3>
          <p>
            A fiduciary entity that applies the policy engine to every query, keeps the audit log
            and distributes query fees.
          </p>
        </div>
      </div>
      <div className="panel">
        <h3>Buyer query portal</h3>
        <p>
          Buyers ask questions for a stated purpose. They never see individual records, only
          aggregates that pass the policy checks.
        </p>
      </div>
    </>
  );
}
