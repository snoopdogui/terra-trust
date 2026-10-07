export default function Stats({ items, label }) {
  return (
    <ul className="stats" aria-label={label}>
      {items.map((s) => (
        <li key={s.label}>
          <span className="stat-value">{s.value}</span>
          <span className="stat-label">{s.label}</span>
        </li>
      ))}
    </ul>
  );
}
