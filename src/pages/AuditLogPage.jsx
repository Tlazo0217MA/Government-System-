import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { formatDateTime } from '../utils/dates.js';
import { Breadcrumbs, EmptyState } from '../components/Navigation.jsx';

// Who sees what:
//  - administrator: only officer-account management (scope "admin"), never citizen activity
//  - Home Affairs: all citizen-related activity
//  - other departments: their own department's activity
export function AuditTable() {
  const { user } = useApp();
  const data = useDb();

  const rows = data.audit.filter((entry) => {
    if (user.role === 'admin') return entry.scope === 'admin';
    if (entry.scope === 'admin') return false;
    return user.role === 'homeaffairs' || entry.role === user.role;
  });

  if (rows.length === 0) return <EmptyState>No activity yet.</EmptyState>;

  return (
    <div className="scroll">
      <table>
        <thead>
          <tr><th>Time</th><th>User</th><th>Action</th><th>Record</th></tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr key={entry.id}>
              <td>{formatDateTime(entry.time)}</td>
              <td>{entry.user} ({entry.role})</td>
              <td>{entry.action}</td>
              <td>{entry.ref}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <>
      <Breadcrumbs items={[['Activity Log']]} />
      <h1>Activity log</h1>
      <p><small>Prototype log. It is not tamper-proof.</small></p>
      <AuditTable />
    </>
  );
}
