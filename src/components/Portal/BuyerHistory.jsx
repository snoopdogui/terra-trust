import PageTitle from '../ui/PageTitle.jsx';
import Badge from '../ui/Badge.jsx';
import BuyerPicker from './BuyerPicker.jsx';
import { useStore } from '../../state/store.jsx';
import { COOP_NAME } from '../../state/dataset.js';
import { describeFilter, purposeLabel, queryTypeLabel } from '../../core/describe.js';
import { REASON_LABEL } from '../../core/policyEngine.js';

const nameFor = (dim, value) => (dim === 'cooperative' ? COOP_NAME[value] ?? value : value);

export default function BuyerHistory() {
  const { state } = useStore();
  const mine = state.trust.audit.filter((e) => e.buyerId === state.buyerId).slice().reverse();
  return (
    <>
      <PageTitle lede="Every query this buyer has made, with the outcome and reason. The data trust keeps the full audit log; a buyer sees only their own queries and never cohort sizes.">
        My queries
      </PageTitle>
      <BuyerPicker />
      {mine.length === 0 ? (
        <p className="muted">No queries yet. Open the query portal to make one.</p>
      ) : (
        <div className="table-wrap" role="region" aria-label="My queries table" tabIndex={0}>
          <table>
            <caption className="sr-only">Queries made by this buyer, newest first</caption>
            <thead>
              <tr>
                <th scope="col" className="num">#</th>
                <th scope="col">Time</th>
                <th scope="col">Purpose</th>
                <th scope="col">Question</th>
                <th scope="col">Selection</th>
                <th scope="col">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((e) => (
                <tr key={e.id}>
                  <td className="num">{e.id}</td>
                  <td className="nowrap">{e.at ? new Date(e.at).toLocaleString('en-GB') : ''}</td>
                  <td>{purposeLabel(e.purpose)}</td>
                  <td>{queryTypeLabel(e.queryType)}{e.groupBy ? ', per cooperative' : ''}</td>
                  <td>{describeFilter(e.filter, nameFor)}</td>
                  <td>
                    <Badge tone={e.decision === 'allow' ? 'ok' : 'bad'}>{REASON_LABEL[e.code] ?? e.code}</Badge>
                    {e.decision === 'refuse' ? <div className="muted">{e.reason}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
