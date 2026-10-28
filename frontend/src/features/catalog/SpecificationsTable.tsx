import { formatSpecValue } from "../../utils/format";

export function SpecificationsTable({ specifications }: { specifications: Record<string, unknown> }) {
  const rows = Object.entries(specifications);

  if (rows.length === 0) {
    return <p className="muted">Detailed specifications are available on request.</p>;
  }

  return (
    <table className="spec-table">
      <tbody>
        {rows.map(([name, value]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            <td>{formatSpecValue(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
