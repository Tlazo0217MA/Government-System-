import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { issueNationalId, eligibilityForId } from '../services/civilService.js';
import Field from '../components/Field.jsx';
import CitizenPicker from '../components/CitizenPicker.jsx';
import PhotoUpload from '../components/PhotoUpload.jsx';
import NeedsCheckboxes from '../components/NeedsCheckboxes.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Breadcrumbs, BackButton } from '../components/Navigation.jsx';
import { NATIONAL_ID_AGE } from '../config/rules.js';

// Service 2: National ID. Finds an EXISTING citizen, checks eligibility, captures the
// information and issues the ID number onto the same profile.
export default function NationalIdPage() {
  const { user } = useApp();
  const [citizen, setCitizen] = useState(null);
  const [form, setForm] = useState({ address: '', phone: '', email: '' });
  const [photo, setPhoto] = useState('');
  const [needs, setNeeds] = useState([]);
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);

  // Start the form with what the profile already holds.
  useEffect(() => {
    if (citizen) setForm({ address: citizen.address || '', phone: citizen.phone || '', email: citizen.email || '' });
  }, [citizen]);

  const problem = citizen ? eligibilityForId(citizen) : '';
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  function handleReview(event) {
    event.preventDefault();
    const found = {};
    if (!form.address.trim()) found.address = 'Residential address is required.';
    if (!/^(\+266)?\d{8}$/.test(form.phone)) found.phone = 'Use 8 digits, optionally starting with +266.';
    if (!photo) found.photo = 'A photo is required.';
    setErrors(found);
    if (Object.keys(found).length === 0) setConfirming(true);
  }

  function handleIssue() {
    const outcome = issueNationalId(user, citizen.id, { ...form, photo, needs });
    setConfirming(false);
    if (outcome.error) { setErrors({ photo: outcome.error }); return; }
    setResult(outcome);
  }

  if (result) {
    return (
      <section className="card">
        <h1 role="status"><FaCheckCircle aria-hidden="true" /> National ID issued</h1>
        <p>{result.citizen.name} ({result.citizen.id}) now has National ID <strong>{result.citizen.nationalId}</strong>.</p>
        <p>Record reference: {result.record.ref}. The existing profile was updated; no new profile was created.</p>
        <h2>Login details for the citizen</h2>
        <p>Username: <strong>{result.credentials.username}</strong></p>
        <p>Temporary password: <strong>{result.credentials.password}</strong></p>
        <p>The citizen can log in once their identity is verified.</p>
        <Link className="btn" to={`/staff/citizens/${result.citizen.id}`}>Open profile</Link>
      </section>
    );
  }

  return (
    <>
      <Breadcrumbs items={[['Civil Registration', '/staff/civil'], ['National ID']]} />
      <h1>Issue National ID</h1>

      <CitizenPicker id="id-citizen" label="Citizen" selected={citizen} onSelect={setCitizen} filter={(c) => c.status === 'Alive' && !c.nationalId} />

      {citizen && problem && (
        <p role="alert" className="err"><FaExclamationTriangle aria-hidden="true" /> {problem}</p>
      )}

      {citizen && !problem && (
        <form className="card" noValidate onSubmit={handleReview}>
          <p><FaCheckCircle aria-hidden="true" /> Eligible: at least {NATIONAL_ID_AGE} years old and no ID yet.</p>
          <div className="grid2">
            <Field id="id-address" label="Residential address" required error={errors.address}>
              <input value={form.address} onChange={update('address')} />
            </Field>
            <Field id="id-phone" label="Phone number" required error={errors.phone} hint="8 digits">
              <input type="tel" value={form.phone} onChange={update('phone')} />
            </Field>
            <Field id="id-email" label="Email address" required={false}>
              <input type="email" value={form.email} onChange={update('email')} />
            </Field>
          </div>
          <PhotoUpload id="id-photo" value={photo} onChange={setPhoto} error={errors.photo} />
          <NeedsCheckboxes needs={needs} onChange={setNeeds} />
          <div className="row">
            <BackButton />
            <button className="btn">Issue National ID</button>
          </div>
        </form>
      )}

      {confirming && (
        <ConfirmDialog title="Issue a National ID?" confirmLabel="Issue ID" onConfirm={handleIssue} onCancel={() => setConfirming(false)}>
          <p>A National ID number will be generated for {citizen.name}. This updates their existing profile.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
