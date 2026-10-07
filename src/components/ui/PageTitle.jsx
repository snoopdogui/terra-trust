// Every view starts with one h1. It takes focus after navigation so keyboard and
// screen reader users land at the top of the new content.
export default function PageTitle({ children, lede }) {
  return (
    <>
      <h1 tabIndex={-1}>{children}</h1>
      {lede ? <p className="lede">{lede}</p> : null}
    </>
  );
}
