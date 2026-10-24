import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { registerDeath } from '../services/civilService.js';
import Field from '../components/Field.jsx';
import CitizenPicker from '../components/CitizenPicker.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Breadcrumbs, BackButton } from '../components/Navigation.jsx';

// Service 3: death. The profile becomes Deceased, history is kept, and pensions,
// the login, passports and vehicles are updated in the same save.
export default function DeathPage() {
  const { user } = useApp();
  const [citizen, setCitizen] = useState(null);
  const [form, setForm] = useState({ dateOfDeath: '', place: '', cause: '', informant: '' });
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  function handleRegister() {
    const outcome = registerDeath(user, { citizenId: citizen?.id, ...form });
    setConfirming(false);
    if (outcome.error) { setError(outcome.error); return; }
    setResult(outcome);
  }

  if (result) {
    return (
      <section className="card">
        <h1 role="status"><FaCheckCircle aria-hidden="true" /> Death registered</h1>
        <p>{result.citizen.name} is now marked as Deceased. Death certificate reference: <strong>{result.record.ref}</strong></p>
        <p>The pension register, login, passport and vehicle records were updated at the same time.</p>
        <Link className="btn" to="/staff/civil">Civil registration</Link>
      </section>
    );
  }

  return (
    <>
      <Breadcrumbs items={[['Civil Registration', '/staff/civil'], ['Death registration']]} />
      <h1>Death registration</h1>
      {error && <p role="alert" className="err">{error}</p>}

      <CitizenPicker id="death-citizen" label="Citizen" selected={citizen} onSelect={setCitizen} filter={(c) => c.status === 'Alive'} />

      <form className="card" noValidate onSubmit={(e) => { e.preventDefault(); setError(''); setConfirming(true); }}>
        <div className="grid2">
          <Field id="death-date" label="Date of death" required><input type="date" value={form.dateOfDeath} onChange={update('dateOfDeath')} /></Field>
          <Field id="death-place" label="Place of death" required><input value={form.place} onChange={update('place')} /></Field>
          <Field id="death-informant" label="Informant (person reporting)" required><input value={form.informant} onChange={update('informant')} /></Field>
        </div>
        <Field id="death-cause" label="Cause of death (kept by Home Affairs only)" required={false}>
          <textarea rows="2" value={form.cause} onChange={update('cause')} />
        </Field>
        <div className="row"><BackButton /><button className="btn danger">Register death</button></div>
      </form>

      {confirming && (
        <ConfirmDialog title="Register this death?" confirmLabel="Register death" onConfirm={handleRegister} onCancel={() => setConfirming(false)}>
          <p>{citizen?.name || 'No citizen selected'} will be marked Deceased. Their login closes, pension payments stop, and their passports and vehicles are flagged. This is a legal record.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
