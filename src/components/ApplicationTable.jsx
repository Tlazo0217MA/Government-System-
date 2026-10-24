import { Link } from 'react-router-dom';
import { FaFileAlt } from 'react-icons/fa';
import { useDb } from '../services/storage.js';
import StatusBadge from './StatusBadge.jsx';
import { EmptyState } from './Navigation.jsx';
import { formatDateTime } from '../utils/dates.js';

// One table used by both citizens and staff. `base` is the detail-page path prefix.
export default function ApplicationTable({ applications, base, showCitizen }) {
  const data = useDb();

  if (applications.length === 0) {
    return <EmptyState><FaFileAlt aria-hidden="true" /> No applications yet.</EmptyState>;
  }

  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Service</th>
            {showCitizen && <th>Citizen</th>}
            <th>Submitted</th>
            <th>Status</th>
            <th><span className="sr">Action</span></th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.ref}>
              <td>{app.ref}</td>
              <td>{data.services.find((s) => s.key === app.service)?.name}</td>
              {showCitizen && <td>{data.citizens.find((c) => c.id === app.citizenId)?.name}</td>}
              <td>{formatDateTime(app.submitted)}</td>
              <td><StatusBadge status={app.status} /></td>
              <td><Link className="btn sm" to={`${base}/${app.ref}`}>View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
