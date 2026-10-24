import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { addCitizen } from '../services/citizenService.js';
import { needLabel } from '../utils/accessibilityNeeds.js';
import Field from '../components/Field.jsx';
import PhotoUpload from '../components/PhotoUpload.jsx';
import NeedsCheckboxes from '../components/NeedsCheckboxes.jsx';
import CitizenPhoto from '../components/CitizenPhoto.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { Breadcrumbs, BackButton } from '../components/Navigation.jsx';

// Required fields and the label used in their error message.
const REQUIRED = {
  firstName: 'First name',
  surname: 'Surname',
  nationalId: 'National ID',
  dob: 'Date of birth',
  gender: 'Gender',
  pob: 'Place of birth',
  nationality: 'Nationality',
  address: 'Residential address',
  phone: 'Phone number',
};

export default function AddCitizenPage() {
  const { user } = useApp();
  const [form, setForm] = useState({ nationality: 'Mosotho', gender: '' });
  const [photo, setPhoto] = useState('');
  const [needs, setNeeds] = useState([]);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState('form');      // 'form' -> 'review' -> 'done'
  const [result, setResult] = useState(null);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  // Returns true when every rule passes; otherwise stores the messages in `errors`.
  function validate() {
    const found = {};
    Object.entries(REQUIRED).forEach(([key, label]) => {
      if (!(form[key] || '').trim()) found[key] = `${label} is required.`;
    });
    if (form.nationalId && !/^\d{10,13}$/.test(form.nationalId)) found.nationalId = 'Use 10 to 13 digits.';
    if (form.dob && new Date(form.dob) > new Date()) found.dob = 'Date of birth cannot be in the future.';
    if (form.phone && !/^(\+266)?\d{8}$/.test(form.phone)) found.phone = 'Use 8 digits, optionally starting with +266.';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) found.email = 'Enter a valid email address.';
    if (!photo) found.photo = 'A citizen photo is required.';
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  function handleReview(event) {
    event.preventDefault();
    if (validate()) setStep('review');
  }

  function handleConfirm() {
    const outcome = addCitizen(user, { ...form, photo, accessibility: { needs } });
    if (outcome.error) {
      // Duplicate National ID: go back to the form and show the message by the field.
      setErrors({ nationalId: outcome.error });
      setStep('form');
      return;
    }
    setResult(outcome);
    setStep('done');
  }

  // Small helper so the text inputs below stay short and consistent.
  function textField(id, key, label, required, type = 'text', hint) {
    return (
      <Field id={id} label={label} required={required} error={errors[key]} hint={hint}>
        <input type={type} value={form[key] || ''} onChange={update(key)} />
      </Field>
    );
  }

  // ----- Step 3: success -----
  if (step === 'done') {
    const { citizen, credentials } = result;
    return (
      <section className="card">
        <h1 role="status"><FaCheckCircle aria-hidden="true" /> Citizen registered</h1>
        <CitizenPhoto photo={citizen.photo} name={citizen.name} size={96} />
        <p>{citizen.name} ({citizen.id}) is now searchable. Status: <StatusBadge status={citizen.verification} /></p>

        <h2>Login details to give to the citizen</h2>
        <p>Username: <strong>{credentials.username}</strong></p>
        <p>Temporary password: <strong>{credentials.password}</strong></p>
        <p>The citizen can only log in after you verify their identity on their profile page.
           Write these details down now: the password is not shown again.</p>

        <Link className="btn" to={`/staff/citizens/${citizen.id}`}>Open profile to verify</Link>{' '}
        <Link className="btn ghost" to="/staff/citizens">Citizen Management</Link>
      </section>
    );
  }

  // ----- Step 2: review -----
  if (step === 'review') {
    const reviewRows = [
      ...Object.entries(REQUIRED).map(([key, label]) => [label, form[key]]),
      ['Middle name', form.middleName],
      ['Email', form.email],
      ['Accessibility needs', needs.map(needLabel).join('; ') || 'None'],
    ].filter(([, value]) => value);

    return (
      <section className="card">
        <Breadcrumbs items={[['Citizens', '/staff/citizens'], ['Add Citizen']]} />
        <h1>Review registration</h1>
        <CitizenPhoto photo={photo} name="this citizen" size={120} />
        <dl>
          {reviewRows.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <div className="row">
          <button className="btn ghost" onClick={() => setStep('form')}>Edit</button>
          <button className="btn" onClick={handleConfirm}>Confirm registration</button>
        </div>
      </section>
    );
  }

  // ----- Step 1: the form -----
  return (
    <>
      <Breadcrumbs items={[['Citizens', '/staff/citizens'], ['Add Citizen']]} />
      <h1>Add citizen</h1>

      <form className="card" noValidate onSubmit={handleReview}>
        <h2>Personal details</h2>
        <div className="grid2">
          {textField('first-name', 'firstName', 'First name', true)}
          {textField('middle-name', 'middleName', 'Middle name', false)}
          {textField('surname', 'surname', 'Surname', true)}
          {textField('national-id', 'nationalId', 'National ID', true, 'text', '10 to 13 digits')}
          {textField('dob', 'dob', 'Date of birth', true, 'date')}
          <Field id="gender" label="Gender" required error={errors.gender}>
            <select value={form.gender} onChange={update('gender')}>
              <option value="">Select</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </Field>
          {textField('place-of-birth', 'pob', 'Place of birth', true)}
          {textField('nationality', 'nationality', 'Nationality', true)}
        </div>

        <h2>Contact details</h2>
        <div className="grid2">
          {textField('address', 'address', 'Residential address', true)}
          {textField('phone', 'phone', 'Phone number', true, 'tel', '8 digits')}
          {textField('email', 'email', 'Email address', false, 'email')}
        </div>

        <h2>Photo</h2>
        <PhotoUpload id="photo" value={photo} onChange={setPhoto} error={errors.photo} />

        <h2>Accessibility</h2>
        <NeedsCheckboxes needs={needs} onChange={setNeeds} />

        <div className="row">
          <BackButton />
          <button className="btn">Review</button>
        </div>
      </form>
    </>
  );
}
