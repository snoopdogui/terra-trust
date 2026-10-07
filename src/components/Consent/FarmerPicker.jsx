import { DATASET, COOP_NAME } from '../../state/dataset.js';
import { useActions, useStore } from '../../state/store.jsx';

// Lets a reader act as any synthetic farmer. This is a demonstration aid, not a login.
export default function FarmerPicker() {
  const { state } = useStore();
  const { selectFarmer } = useActions();
  const farmer = DATASET.farmers.find((f) => f.id === state.farmerId);
  return (
    <div className="field">
      <label htmlFor="farmer-picker">Act as synthetic farmer</label>
      <select id="farmer-picker" value={state.farmerId} onChange={(e) => selectFarmer(e.target.value)}>
        {DATASET.farmers.map((f) => (
          <option key={f.id} value={f.id}>
            {f.id} ({COOP_NAME[f.cooperativeId]}, zone {f.zoneId})
          </option>
        ))}
      </select>
      <span className="hint">
        Switching farmer is a demonstration aid. There is no login in this prototype. {farmer.id} is
        an invented record.
      </span>
    </div>
  );
}
