import { useState } from 'react';
import { FaLock, FaCheckCircle } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { getSpouse, getMaritalStatus, getChildren } from '../services/familyService.js';
import { requestCorrection } from '../services/citizenService.js';
import { needLabel } from '../utils/accessibilityNeeds.js';
import { formatDateTime } from '../utils/dates.js';
import CitizenPhoto from '../components/CitizenPhoto.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { Breadcrumbs } from '../components/Navigation.jsx';

export default function CitizenProfilePage() {
  const { user } = useApp();
  const data = useDb();
  const citizen = data.citizens.find((c) => c.id === user.citizenId);
  const [requestSent, setRequestSent] = useState(false);
  const needs = citizen.accessibility?.needs || [];
  const spouse = getSpouse(citizen.id);
  const children = getChildren(citizen.id);

  const rows = [
    ['Reference ID', citizen.id],
    ['National ID', citizen.nationalId || 'No National ID yet'],
    ['Full name', citizen.name],
    ['Date of birth', citizen.dob],
    ['Gender', citizen.gender],
    ['Place of birth', citizen.pob],
    ['Nationality', citizen.nationality],
    ['Address', citizen.address],
    ['Phone', citizen.phone],
    ['Email', citizen.email || 'Not provided'],
    ['Registered', formatDateTime(citizen.registered)],
  ];

  function handleCorrection() {
    requestCorrection(user, citizen.id);
    setRequestSent(true);
  }

  return (
    <>
      <Breadcrumbs items={[['My Profile']]} />
      <h1>My profile</h1>

      <section className="card">
        <p><FaLock aria-hidden="true" /> These details are managed by Home Affairs. You cannot edit them here.</p>
        <CitizenPhoto photo={citizen.photo} name={citizen.name} size={140} />
        <dl>
          {rows.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
          <div><dt>Verification</dt><dd><StatusBadge status={citizen.verification} /></dd></div>
          <div><dt>Marital status</dt><dd>{getMaritalStatus(citizen.id)}{spouse ? `: ${spouse.name}` : ''}</dd></div>
          <div><dt>Children</dt><dd>{children.length ? children.map((c) => c.name).join(', ') : 'None recorded'}</dd></div>
          <div>
            <dt>Accessibility needs</dt>
            <dd>{needs.length ? needs.map(needLabel).join('; ') : 'None recorded'}</dd>
          </div>
        </dl>

        <button className="btn" onClick={handleCorrection}>Request a correction</button>
        {requestSent && (
          <p role="status" className="ok">
            <FaCheckCircle aria-hidden="true" /> Correction request sent to Home Affairs.
          </p>
        )}
      </section>
    </>
  );
}
