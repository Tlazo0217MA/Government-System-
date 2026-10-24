import { Link } from 'react-router-dom';
import { FaSearch, FaUserPlus } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { recordTypesFor } from '../config/recordTypes.js';
import StatusCounts from '../components/StatusCounts.jsx';
import ApplicationTable from '../components/ApplicationTable.jsx';

export default function StaffDashboard() {
  const { user } = useApp();
  const data = useDb();
  const isHomeAffairs = user.role === 'homeaffairs';
  const applications = data.applications.filter((a) => isHomeAffairs || a.dept === user.role);
  const pendingRequests = data.accessRequests.filter((r) => r.status === 'Pending').length;
  const title = isHomeAffairs ? 'Home Affairs' : user.role[0].toUpperCase() + user.role.slice(1);

  return (
    <>
      <h1>{title} dashboard</h1>
      <StatusCounts applications={applications} />

      <div className="row">
        <Link className="btn" to="/staff/citizens"><FaSearch aria-hidden="true" /> Citizen search</Link>
        {isHomeAffairs && (
          <Link className="btn" to="/staff/citizens/new"><FaUserPlus aria-hidden="true" /> Add Citizen</Link>
        )}
      </div>

      {isHomeAffairs && (
        <p>
          <Link to="/staff/requests">{pendingRequests} pending access request{pendingRequests === 1 ? '' : 's'}</Link>
        </p>
      )}

      {isHomeAffairs && (
        <p><Link className="btn" to="/staff/civil">Civil registration</Link></p>
      )}

      {!isHomeAffairs && (
        <section className="card">
          <h2>Your records</h2>
          <ul>
            {user.role === 'pensions' && (
              <li><Link to="/staff/pension-register">Pension register</Link> ({data.pensionRegister.length} people)</li>
            )}
            {recordTypesFor(user.role).map(([key, type]) => (
              <li key={key}>
                <Link to={`/staff/records/${key}`}>{type.plural}</Link>{' '}
                ({data.records.filter((r) => r.type === key && !r.archived).length})
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2>Recent applications</h2>
      <ApplicationTable applications={applications.slice(0, 5)} base="/staff/applications" showCitizen />
    </>
  );
}
