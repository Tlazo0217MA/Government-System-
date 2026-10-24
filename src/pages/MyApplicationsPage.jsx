import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import ApplicationTable from '../components/ApplicationTable.jsx';
import { Breadcrumbs } from '../components/Navigation.jsx';

export default function MyApplicationsPage() {
  const { user } = useApp();
  const data = useDb();
  // Mine = ones I applied for, including applications I made for my child.
  const mine = data.applications.filter((a) => a.applicantId === user.citizenId || a.citizenId === user.citizenId);

  return (
    <>
      <Breadcrumbs items={[['My Applications']]} />
      <h1>My applications</h1>
      <ApplicationTable applications={mine} base="/applications" showCitizen />
    </>
  );
}
