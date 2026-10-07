// Status is always carried by text as well as colour.
export default function Badge({ tone = 'plain', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
