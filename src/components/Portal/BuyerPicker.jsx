import { BUYERS } from '../../core/constants.js';
import { purposeLabel } from '../../core/describe.js';
import { useActions, useStore } from '../../state/store.jsx';

export default function BuyerPicker() {
  const { state } = useStore();
  const { selectBuyer } = useActions();
  const buyer = BUYERS.find((b) => b.id === state.buyerId);
  return (
    <div className="field">
      <label htmlFor="buyer-picker">Act as synthetic buyer</label>
      <select id="buyer-picker" value={state.buyerId} onChange={(e) => selectBuyer(e.target.value)}>
        {BUYERS.map((b) => (
          <option key={b.id} value={b.id}>{b.name} ({b.kind})</option>
        ))}
      </select>
      <span className="hint">
        Approved purposes: {buyer.purposes.map(purposeLabel).join(', ')}. These buyers are invented
        and the role switch is a demonstration aid, not a login.
      </span>
    </div>
  );
}
