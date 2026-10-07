export default function Tabs({ label, items, current, onSelect }) {
  return (
    <nav aria-label={label}>
      <ul className="tabs">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              aria-current={current === item.id ? 'page' : undefined}
              onClick={() => onSelect(item.id)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
