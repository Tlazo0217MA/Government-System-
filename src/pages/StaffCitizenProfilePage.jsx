import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaCheckCircle, FaLock } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { getVisibleCitizen, EXTRA_FIELDS } from '../services/permissions.js';
import { requestAccess } from '../services/accessService.js';
import { recordsForCitizen } from '../services/recordService.js';
import { civilRecordsFor } from '../services/civilService.js';
import { getSpouse, getMaritalStatus, getChildren } from '../services/familyService.js';
import { RECORD_TYPES } from '../config/recordTypes.js';
import { idText } from '../config/rules.js';
import {
  verifyCitizen, updateContactDetails, updateAccessibilityNeeds, getCitizenAccount,
  setCitizenPassword, suggestPassword,
} from '../services/citizenService.js';
import { needLabel } from '../utils/accessibilityNeeds.js';
import Field from '../components/Field.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import CitizenPhoto from '../components/CitizenPhoto.jsx';
import NeedsCheckboxes from '../components/NeedsCheckboxes.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PasswordDialog from '../components/PasswordDialog.jsx';
import ApplicationTable from '../components/ApplicationTable.jsx';
import { Breadcrumbs, EmptyState } from '../components/Navigation.jsx';

export default function StaffCitizenProfilePage() {
  const { citizenId } = useParams();
  const { user } = useApp();
  const data = useDb();
  const isHomeAffairs = user.role === 'homeaffairs';

  const [verifying, setVerifying] = useState(false);
  const [contactEdit, setContactEdit] = useState(null);  // { phone, address } while editing
  const [needsEdit, setNeedsEdit] = useState(null);      // array of need keys while editing
  const [changingPassword, setChangingPassword] = useState(false);

  // Department officers: the "request more details" form.
  const [requestFields, setRequestFields] = useState([]);
  const [requestReason, setRequestReason] = useState('');
  const [requestError, setRequestError] = useState('');

  const citizen = getVisibleCitizen(user, data.citizens.find((c) => c.id === citizenId));
  if (!citizen) return <EmptyState>Citizen not found.</EmptyState>;

  const account = getCitizenAccount(citizenId);
  const applications = data.applications.filter(
    (a) => a.citizenId === citizenId && (isHomeAffairs || a.dept === user.role)
  );
  const civilRecords = isHomeAffairs ? civilRecordsFor(citizenId) : [];
  const lostIdReports = isHomeAffairs ? data.records.filter((r) => r.type === 'lostIdReport' && r.citizenId === citizenId) : [];
  const departmentRecords = isHomeAffairs ? [] : recordsForCitizen(user, citizenId);
  const myRequests = data.accessRequests.filter((r) => r.citizenId === citizenId && r.requesterId === user.id);

  // Rows everyone may see; Home Affairs sees the full profile, departments see approved extras.
  const identityRows = [['National ID', idText(citizen)], ['Date of birth', citizen.dob]];
  if (!isHomeAffairs && citizen.dateOfDeath) identityRows.push(['Date of death', citizen.dateOfDeath]);
  if (isHomeAffairs) {
    identityRows.push(
      ['Gender', citizen.gender],
      ['Place of birth', citizen.pob],
      ['Nationality', citizen.nationality],
      ['Residential address', citizen.address],
      ['Phone number', citizen.phone],
      ['Email address', citizen.email || 'Not provided'],
      ['Accessibility needs', (citizen.accessibility?.needs || []).map(needLabel).join('; ') || 'None recorded'],
      ['Marital status', `${getMaritalStatus(citizenId)}${getSpouse(citizenId) ? ': ' + getSpouse(citizenId).name : ''}`],
      ['Parents', (citizen.parents || []).map((p) => `${p.relation}: ${p.name}`).join('; ') || 'Not recorded'],
      ['Children', getChildren(citizenId).map((c) => c.name).join(', ') || 'None recorded'],
    );
  } else {
    citizen.approvedFields.forEach((field) => identityRows.push([EXTRA_FIELDS[field], citizen[field] || 'Not provided']));
  }

  // Fields this officer could still ask for (not yet approved).
  const requestable = Object.keys(EXTRA_FIELDS).filter((f) => !citizen.approvedFields?.includes(f));

  function toggleRequestField(field) {
    setRequestFields(requestFields.includes(field) ? requestFields.filter((f) => f !== field) : [...requestFields, field]);
  }

  function handleRequest(event) {
    event.preventDefault();
    if (requestFields.length === 0) { setRequestError('Choose at least one detail to request.'); return; }
    if (!requestReason.trim()) { setRequestError('Give a reason for the request.'); return; }
    requestAccess(user, citizenId, requestFields, requestReason.trim());
    setRequestFields([]);
    setRequestReason('');
    setRequestError('');
  }

  return (
    <>
      <Breadcrumbs items={[['Citizens', '/staff/citizens'], [citizen.name]]} />
      <h1>{citizen.name}</h1>
      <p>{citizen.id} <StatusBadge status={citizen.verification} /> <StatusBadge status={citizen.status || 'Alive'} /></p>

      {citizen.restricted && (
        <p><FaLock aria-hidden="true" /> Restricted: you can see the photo, name, National ID and date of birth,
          plus {user.role} records and any details Home Affairs has approved for you.</p>
      )}

      <section className="card profile-top">
        <CitizenPhoto photo={citizen.photo} name={citizen.name} size={140} />
        <div>
          <h2>Identity information available</h2>
          <dl>
            <div><dt>Full name</dt><dd>{citizen.name}</dd></div>
            {identityRows.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      {isHomeAffairs && account && (
        <section className="card">
          <h2>Login details</h2>
          <dl>
            <div><dt>Username</dt><dd>{account.username}</dd></div>
            <div><dt>Password</dt><dd>{account.password}</dd></div>
          </dl>
          <button className="btn ghost" onClick={() => setChangingPassword(true)}>Change password</button>
        </section>
      )}

      {isHomeAffairs && (
        <div className="row">
          {citizen.verification !== 'Verified' && (
            <button className="btn" onClick={() => setVerifying(true)}>
              <FaCheckCircle aria-hidden="true" /> Verify identity
            </button>
          )}
          <button className="btn ghost" onClick={() => setContactEdit({ phone: citizen.phone, address: citizen.address })}>
            Edit contact details
          </button>
          <button className="btn ghost" onClick={() => setNeedsEdit(citizen.accessibility?.needs || [])}>
            Edit accessibility needs
          </button>
        </div>
      )}

      {/* Department officers ask Home Affairs for more details. */}
      {!isHomeAffairs && requestable.length > 0 && (
        <form className="card" onSubmit={handleRequest} noValidate>
          <h2>Request more details</h2>
          <p>Home Affairs must approve this before the details appear.</p>
          <fieldset className="needs">
            <legend>Details needed</legend>
            {requestable.map((field) => (
              <label key={field} className="check">
                <input type="checkbox" checked={requestFields.includes(field)} onChange={() => toggleRequestField(field)} />
                {EXTRA_FIELDS[field]}
              </label>
            ))}
          </fieldset>
          <Field id="request-reason" label="Reason for request" required error={requestError}>
            <textarea rows="2" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} />
          </Field>
          <button className="btn">Send request</button>
        </form>
      )}

      {!isHomeAffairs && myRequests.length > 0 && (
        <section className="card">
          <h2>Your requests</h2>
          <ul>
            {myRequests.map((r) => (
              <li key={r.id}>
                {r.fields.map((f) => EXTRA_FIELDS[f]).join(', ')}: <StatusBadge status={r.status} />
                {r.decisionNote && <span> Reason: {r.decisionNote}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isHomeAffairs ? (
        <section className="card">
          <h2>Civil records</h2>
          {civilRecords.length === 0 ? <p>No civil records.</p> : (
            <ul>{civilRecords.map((r) => <li key={r.ref}>{r.ref}: {r.type} <StatusBadge status={r.status} /></li>)}</ul>
          )}
          {citizen.dateOfDeath && <p>Date of death: {citizen.dateOfDeath}.</p>}
          {lostIdReports.length > 0 && (
            <>
              <h3>Police reports about identity documents</h3>
              <ul>{lostIdReports.map((r) => <li key={r.ref}>{r.ref}: {r.data.documentType} <StatusBadge status={r.status} /></li>)}</ul>
            </>
          )}
        </section>
      ) : (
        <section className="card">
          <h2>{user.role} records for this citizen</h2>
          {departmentRecords.length === 0 ? <p>No records on file.</p> : (
            <ul>
              {departmentRecords.map((r) => (
                <li key={r.ref}>
                  <Link to={`/staff/records/${r.type}/${r.ref}`}>{r.ref}</Link> {RECORD_TYPES[r.type].title} <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <h2>Applications</h2>
      <ApplicationTable applications={applications} base="/staff/applications" />

      {verifying && (
        <ConfirmDialog
          title="Mark identity as verified?"
          onCancel={() => setVerifying(false)}
          onConfirm={() => { verifyCitizen(user, citizenId); setVerifying(false); }}
        >
          <p>Confirm you have checked the supporting documents. The citizen will then be able to log in.</p>
        </ConfirmDialog>
      )}

      {contactEdit && (
        <ConfirmDialog
          title="Edit contact details"
          confirmLabel="Save"
          onCancel={() => setContactEdit(null)}
          onConfirm={() => { updateContactDetails(user, citizenId, contactEdit); setContactEdit(null); }}
        >
          <Field id="edit-phone" label="Phone" required>
            <input value={contactEdit.phone} onChange={(e) => setContactEdit({ ...contactEdit, phone: e.target.value })} />
          </Field>
          <Field id="edit-address" label="Address" required>
            <input value={contactEdit.address} onChange={(e) => setContactEdit({ ...contactEdit, address: e.target.value })} />
          </Field>
        </ConfirmDialog>
      )}

      {needsEdit && (
        <ConfirmDialog
          title="Edit accessibility needs"
          confirmLabel="Save"
          onCancel={() => setNeedsEdit(null)}
          onConfirm={() => { updateAccessibilityNeeds(user, citizenId, { needs: needsEdit }); setNeedsEdit(null); }}
        >
          <NeedsCheckboxes needs={needsEdit} onChange={setNeedsEdit} />
        </ConfirmDialog>
      )}

      {changingPassword && (
        <PasswordDialog
          title="Change citizen password"
          suggestion={suggestPassword()}
          onSave={(password) => setCitizenPassword(user, citizenId, password)}
          onClose={() => setChangingPassword(false)}
        />
      )}
    </>
  );
}
