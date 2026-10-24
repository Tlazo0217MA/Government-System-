import { Link } from 'react-router-dom';
import { FaBell, FaPlus } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { getDependents } from '../services/familyService.js';
import { describeAdaptations } from '../utils/accessibilityNeeds.js';
import CitizenPhoto from '../components/CitizenPhoto.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import StatusCounts from '../components/StatusCounts.jsx';
import ApplicationTable from '../components/ApplicationTable.jsx';
import { Hint } from '../components/Navigation.jsx';

export default function CitizenDashboard() {
  const { user, t, adaptations } = useApp();
  const data = useDb();
  const citizen = data.citizens.find((c) => c.id === user.citizenId);
  const applications = data.applications.filter((a) => a.applicantId === citizen.id || a.citizenId === citizen.id);
  const children = getDependents(citizen.id);
  const unread = data.notifications.filter((n) => n.citizenId === citizen.id && !n.read).length;
  const adaptationList = describeAdaptations(citizen.accessibility?.needs);

  return (
    <>
      <h1>Welcome, {citizen.firstName}</h1>
      {adaptations.simpleGuidance && (
        <Hint>Choose "Apply for passport" to start. Your details are already filled in. You only answer a few questions.</Hint>
      )}

      <div className="grid">
        <section className="card">
          <h2>Your identity</h2>
          <CitizenPhoto photo={citizen.photo} name={citizen.name} size={96} />
          <p>{citizen.name}</p>
          <StatusBadge status={citizen.verification} />
          <p><Link to="/citizen/profile">{t('My Profile')}</Link></p>
        </section>

        <section className="card">
          <h2>Notifications</h2>
          <p>{unread} unread</p>
          <Link className="btn" to="/notifications"><FaBell aria-hidden="true" /> {t('Notifications')}</Link>
        </section>

        <section className="card">
          <h2>Start something</h2>
          <Link className="btn" to="/apply/passport"><FaPlus aria-hidden="true" /> Apply for passport</Link>{' '}
          <Link className="btn ghost" to="/services">{t('Services')}</Link>
        </section>
      </div>

      {children.length > 0 && (
        <section className="card">
          <h2>My children</h2>
          <ul>
            {children.map((child) => (
              <li key={child.id}>
                {child.name}, born {child.dob}{' '}
                <Link className="btn sm" to={`/apply/passport?for=${child.id}`}>Apply for passport for {child.firstName}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {adaptationList.length > 0 && (
        <section className="card">
          <h2>Settings applied for you</h2>
          <p>Home Affairs recorded your accessibility needs, so this site adjusted itself:</p>
          <ul>{adaptationList.map((line) => <li key={line}>{line}</li>)}</ul>
        </section>
      )}

      <h2>Your applications</h2>
      <StatusCounts applications={applications} />
      <ApplicationTable applications={applications.slice(0, 5)} base="/applications" showCitizen />
    </>
  );
}
