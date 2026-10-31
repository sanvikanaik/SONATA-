export default function Badge({ value }) {
  return <span className={`badge ${value}`}>{String(value).replace("_", " ")}</span>;
}
