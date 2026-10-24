import StatusBadge from './StatusBadge.jsx';

const TRACKED = ['Submitted', 'Under Review', 'Requires Additional Information', 'Approved', 'Rejected'];

// A row of "number + status" tiles for dashboards.
export default function StatusCounts({ applications }) {
  return (
    <ul className="stats">
      {TRACKED.map((status) => (
        <li key={status} className="stat">
          <strong>{applications.filter((a) => a.status === status).length}</strong>
          <StatusBadge status={status} />
        </li>
      ))}
    </ul>
  );
}
