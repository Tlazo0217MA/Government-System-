import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { registerBirth } from '../services/civilService.js';
import { getDependents } from '../services/familyService.js';
import Field from '../components/Field.jsx';
import ParentField, { spouseOf } from '../components/ParentField.jsx';
import PhotoUpload from '../components/PhotoUpload.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { Breadcrumbs, BackButton } from '../components/Navigation.jsx';
import { today } from '../config/rules.js';

const NO_PARENT = { citizenId: '', name: '', nationalId: '' };
const REQUIRED = {
  firstName: 'First name', surname: 'Surname', dob: 'Date of birth',
  gender: 'Gender', pob: 'Place of birth', nationality: 'Nationality', address: 'Residential address',
};

// Service 1: birth registration. Creates the baby's citizen profile (no National ID yet)
// and a birth certificate reference. The profile is updated later when the child is old
// enough for an ID, and a registered parent can apply for the baby's passport.
export default function BirthPage() {
  const { user } = useApp();
  const [form, setForm] = useState({ nationality: 'Mosotho', gender: '' });
  const [photo, setPhoto] = useState('');
  const [mother, setMother] = useState(NO_PARENT);
  const [father, setFather] = useState(NO_PARENT);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState('form');
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  function validate() {
    const found = {};
    Object.entries(REQUIRED).forEach(([key, label]) => {
      if (!(form[key] || '').trim()) found[key] = `${label} is required.`;
    });
    if (form.dob && form.dob > today()) found.dob = 'Date of birth cannot be in the future.';
    if (!mother.name && !father.name) found.parents = 'Record at least one parent.';
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  function handleConfirm() {
    const outcome = registerBirth(user, { ...form, photo, mother, father });
    if (outcome.error) { setMessage(outcome.error); setStep('form'); return; }
    setResult(outcome);
    setStep('done');
  }

  const textField = (id, key, label, required, type = 'text') => (
    <Field id={id} label={label} required={required} error={errors[key]}>
      <input type={type} value={form[key] || ''} onChange={update(key)} />
    </Field>
  );

  if (step === 'done') {
    const { citizen, record } = result;
    const parentsWithProfiles = citizen.parents.filter((p) => p.citizenId);
    return (
      <section className="card">
        <h1 role="status"><FaCheckCircle aria-hidden="true" /> Birth registered</h1>
        <p>{citizen.name} ({citizen.id}), born {citizen.dob}.</p>
        <p>Birth certificate reference: <strong>{record.ref}</strong></p>
        <p>National ID: <strong>none yet</strong>. It can be issued when the child is old enough.</p>
        <p>Verification: <StatusBadge status={citizen.verification} /></p>
        {parentsWithProfiles.length > 0 && (
          <p>The linked parents can apply for this child's passport from their own accounts.
            {parentsWithProfiles.map((p) => ` ${p.name}: ${getDependents(p.citizenId).some((d) => d.id === citizen.id) ? 'can apply' : 'cannot apply yet'}.`)}
          </p>
        )}
        <Link className="btn" to={`/staff/citizens/${citizen.id}`}>Open profile</Link>{' '}
        <Link className="btn ghost" to="/staff/civil">Civil registration</Link>
      </section>
    );
  }

  if (step === 'review') {
    return (
      <section className="card">
        <Breadcrumbs items={[['Civil Registration', '/staff/civil'], ['Birth registration']]} />
        <h1>Review birth registration</h1>
        <dl>
          <div><dt>Baby</dt><dd>{[form.firstName, form.middleName, form.surname].filter(Boolean).join(' ')}</dd></div>
          <div><dt>Date of birth</dt><dd>{form.dob}</dd></div>
          <div><dt>Gender</dt><dd>{form.gender}</dd></div>
          <div><dt>Place of birth</dt><dd>{form.pob}</dd></div>
          <div><dt>Mother</dt><dd>{mother.name || 'Not recorded'}</dd></div>
          <div><dt>Father</dt><dd>{father.name || 'Not recorded'}</dd></div>
        </dl>
        <div className="row">
          <button className="btn ghost" onClick={() => setStep('form')}>Edit</button>
          <button className="btn" onClick={handleConfirm}>Confirm registration</button>
        </div>
      </section>
    );
  }

  return (
    <>
      <Breadcrumbs items={[['Civil Registration', '/staff/civil'], ['Birth registration']]} />
      <h1>Birth registration</h1>
      {message && <p role="alert" className="err">{message}</p>}

      <form className="card" noValidate onSubmit={(e) => { e.preventDefault(); setMessage(''); if (validate()) setStep('review'); }}>
        <h2>Baby</h2>
        <div className="grid2">
          {textField('baby-first', 'firstName', 'First name', true)}
          {textField('baby-middle', 'middleName', 'Middle name', false)}
          {textField('baby-surname', 'surname', 'Surname', true)}
          {textField('baby-dob', 'dob', 'Date of birth', true, 'date')}
          <Field id="baby-gender" label="Gender" required error={errors.gender}>
            <select value={form.gender} onChange={update('gender')}>
              <option value="">Select</option><option>Female</option><option>Male</option>
            </select>
          </Field>
          {textField('baby-pob', 'pob', 'Place of birth', true)}
          {textField('baby-nationality', 'nationality', 'Nationality', true)}
          {textField('baby-address', 'address', 'Residential address', true)}
        </div>
        <PhotoUpload id="baby-photo" value={photo} onChange={setPhoto} required={false} />

        <h2>Parents</h2>
        {errors.parents && <p role="alert" className="err">{errors.parents}</p>}
        <ParentField id="mother" label="Mother" value={mother} onChange={setMother} suggestion={!mother.citizen ? spouseOf(father) : null} />
        <ParentField id="father" label="Father" value={father} onChange={setFather} suggestion={!father.citizen ? spouseOf(mother) : null} />

        <div className="row">
          <BackButton />
          <button className="btn">Review</button>
        </div>
      </form>
    </>
  );
}
