import { ROLES } from '../../views/viewConfig.js';

export default function RoleSwitcher({ role, onChange }) {
  return (
    <fieldset className="role-switch">
      <legend className="sr-only">Choose a role view</legend>
      {ROLES.map((r) => (
        <label key={r.id}>
          <input
            type="radio"
            name="role"
            value={r.id}
            checked={role === r.id}
            onChange={() => onChange(r.id)}
          />
          <span>{r.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
