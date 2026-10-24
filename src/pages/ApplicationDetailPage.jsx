import { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { FaCheckCircle, FaFileAlt, FaLock, FaExclamationTriangle } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { setStatus, NEXT_STATUSES } from '../services/applicationService.js';
import { getVisibleCitizen } from '../services/permissions.js';
import { idText } from '../config/rules.js';
import Field from '../components/Field.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import StatusTimeline from '../components/StatusTimeline.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import CitizenPhoto from '../components/CitizenPhoto.jsx';
import { Breadcrumbs, BackButton, EmptyState } from '../components/Navigation.jsx';

const BUTTON_LABELS = {
  'Under Review': 'Start review',
  'Requires Additional Information': 'Request more information',
};

// One page for both audiences: citizens (staff=false) and officers (staff=true).
export default function ApplicationDetailPage({ staff }) {
  const { ref } = useParams();
  const location = useLocation();
  const { user } = useApp();
  const data = useDb();
  const [pendingStatus, setPendingStatus] = useState(null);
  const [reply, setReply] = useState('');

  const application = data.applications.find((a) => a.ref === ref);

  // Access rules: citizens see applications they made or that are about them;
  // officers only see their own department's (Home Affairs sees all, read-only).
  const mine = application && (application.applicantId === user.citizenId || application.citizenId === user.citizenId);
  const allowed = application && (staff ? user.role === 'homeaffairs' || application.dept === user.role : mine);
  if (!allowed) {
    return <EmptyState><FaLock aria-hidden="true" /> Application not found or access denied.</EmptyState>;
  }

  const rawCitizen = data.citizens.find((c) => c.id === application.citizenId);
  const citizen = getVisibleCitizen(user, rawCitizen);
  const applicant = data.citizens.find((c) => c.id === application.applicantId);
  const service = data.services.find((s) => s.key === application.service);
  const canProcess = staff && application.dept === user.role;
  const lastStep = application.history[application.history.length - 1];
  const fee = data.records.find((r) => r.type === 'fee' && r.data.applicationRef === application.ref);

  // Police only: how many criminal case records exist for this person (clearance review).
  const caseCount = canProcess && user.role === 'police'
    ? data.records.filter((r) => r.type === 'criminalRecord' && r.citizenId === application.citizenId && !r.archived).length
    : null;

  // Staff buttons exclude "Cancelled", which belongs to the applicant.
  const staffOptions = (NEXT_STATUSES[application.status] || []).filter((s) => s !== 'Cancelled');

  function sendCitizenReply() {
    application.info['Additional information'] = reply;
    setStatus(user, application.ref, 'Under Review', `Citizen responded: ${reply}`);
  }

  return (
    <>
      <Breadcrumbs items={[
        [staff ? 'Applications' : 'My Applications', staff ? '/staff/applications' : '/applications'],
        [application.ref],
      ]} />
      <h1>{service.name} <small>{application.ref}</small></h1>

      {location.state?.justSubmitted && (
        <p role="status" className="ok big">
          <FaCheckCircle aria-hidden="true" /> Submitted. Your reference is {application.ref}. Keep it to track progress.
        </p>
      )}

      <p><StatusBadge status={application.status} /></p>
      {citizen.status === 'Deceased' && (
        <p role="alert" className="err"><FaExclamationTriangle aria-hidden="true" /> The citizen is registered as deceased by Home Affairs. Do not issue anything for this application.</p>
      )}

      {!staff && application.status === 'Requires Additional Information' && (
        <section className="card warn">
          <h2>Action needed</h2>
          <p>{lastStep.note}</p>
          <Field id="reply" label="Your response" required>
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} />
          </Field>
          <button className="btn" disabled={!reply.trim()} onClick={sendCitizenReply}>Send response</button>
        </section>
      )}

      <div className="grid">
        <section className="card">
          <h2>{application.applicantId !== application.citizenId ? 'Applying for' : 'Citizen'}</h2>
          <CitizenPhoto photo={citizen.photo} name={citizen.name} size={96} />
          <dl>
            <div><dt>Name</dt><dd>{citizen.name}</dd></div>
            <div><dt>National ID</dt><dd>{idText(citizen)}</dd></div>
            <div><dt>Date of birth</dt><dd>{citizen.dob}</dd></div>
            <div><dt>Verification</dt><dd><StatusBadge status={citizen.verification} /></dd></div>
            {applicant && applicant.id !== citizen.id && <div><dt>Applicant</dt><dd>{applicant.name}</dd></div>}
          </dl>
        </section>

        <section className="card">
          <h2>Submitted information</h2>
          <dl>
            {Object.entries(application.info).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
            {fee && <div><dt>Fee</dt><dd>M{fee.data.amount} <StatusBadge status={fee.status} />{fee.data.receipt && ` Receipt ${fee.data.receipt}`}</dd></div>}
          </dl>
          <h3>Documents</h3>
          <ul>
            {application.docs.map((doc, index) => (
              <li key={index}><FaFileAlt aria-hidden="true" /> {doc.name}</li>
            ))}
          </ul>
        </section>
      </div>

      {caseCount !== null && (
        <section className="card">
          <h2>Police record check</h2>
          <p>{caseCount === 0 ? 'No criminal case records on file for this citizen.' : `${caseCount} criminal case record(s) on file. Review them under Criminal Records.`}</p>
          <p><small>The citizen only sees the clearance status, never the record details.</small></p>
        </section>
      )}

      <h2>Progress</h2>
      <StatusTimeline history={application.history} />

      {!staff && application.status === 'Submitted' && (
        <button className="btn danger" onClick={() => setPendingStatus('Cancelled')}>Cancel application</button>
      )}

      {canProcess && staffOptions.length > 0 && (
        <div className="row">
          {staffOptions.map((next) => (
            <button key={next} className={next === 'Rejected' ? 'btn danger' : 'btn'} onClick={() => setPendingStatus(next)}>
              {BUTTON_LABELS[next] || next}
            </button>
          ))}
        </div>
      )}

      {pendingStatus && (
        <ConfirmDialog
          title={`Change status to ${pendingStatus}?`}
          needReason={['Rejected', 'Requires Additional Information'].includes(pendingStatus)}
          onCancel={() => setPendingStatus(null)}
          onConfirm={(reason) => {
            setStatus(user, application.ref, pendingStatus, reason);
            setPendingStatus(null);
          }}
        >
          <p>{pendingStatus === 'Cancelled' ? 'This cannot be undone.' : 'The applicant will be notified.'}</p>
        </ConfirmDialog>
      )}

      <BackButton />
    </>
  );
}
