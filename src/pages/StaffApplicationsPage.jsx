import { Link } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import ApplicationTable from '../components/ApplicationTable.jsx';
import { Breadcrumbs } from '../components/Navigation.jsx';

export default function StaffApplicationsPage() {
  const { user } = useApp();
  const data = useDb();
  const applications = data.applications.filter((a) => user.role === 'homeaffairs' || a.dept === user.role);

  return (
    <>
      <Breadcrumbs items={[['Applications']]} />
      <h1>Applications</h1>
      {user.role !== 'homeaffairs' && (
        <Link className="btn" to="/staff/applications/new"><FaPlus aria-hidden="true" /> New application</Link>
      )}
      <ApplicationTable applications={applications} base="/staff/applications" showCitizen />
    </>
  );
}
