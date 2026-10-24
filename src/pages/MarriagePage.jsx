import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { registerMarriage } from '../services/civilService.js';
import { getMaritalStatus } from '../services/familyService.js';
import Field from '../components/Field.jsx';
import CitizenPicker from '../components/CitizenPicker.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Breadcrumbs, BackButton } from '../components/Navigation.jsx';

// Service 2: marriage. Both spouses must already be registered citizens.
// The marriage record is linked to BOTH profiles.
export default function MarriagePage() {
  const { user } = useApp();
  const [spouse1, setSpouse1] = useState(null);
  const [spouse2, setSpouse2] = useState(null);
  const [form, setForm] = useState({ date: '', place: '', witnesses: '' });
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [record, setRecord] = useState(null);

  const eligible = (c) => c.status === 'Alive' && !!c.nationalId && getMaritalStatus(c.id) !== 'Married';
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  function handleSubmit() {
    const outcome = registerMarriage(user, { spouse1Id: spouse1?.id, spouse2Id: spouse2?.id, ...form });
    setConfirming(false);
    if (outcome.error) { setError(outcome.error); return; }
    setRecord(outcome.record);
  }

  if (record) {
    return (
      <section className="card">
        <h1 role="status"><FaCheckCircle aria-hidden="true" /> Marriage registered</h1>
        <p>Marriage certificate reference: <strong>{record.ref}</strong></p>
        <p>{spouse1.name} and {spouse2.name} are now linked. Either spouse can apply for the passport of a child the other is registered as parent of.</p>
        <Link className="btn" to="/staff/civil">Civil registration</Link>
      </section>
    );
  }

  return (
    <>
      <Breadcrumbs items={[['Civil Registration', '/staff/civil'], ['Marriage registration']]} />
      <h1>Marriage registration</h1>
      {error && <p role="alert" className="err">{error}</p>}

      <CitizenPicker id="spouse-one" label="First spouse" selected={spouse1} onSelect={setSpouse1} filter={(c) => eligible(c) && c.id !== spouse2?.id} />
      <CitizenPicker id="spouse-two" label="Second spouse" selected={spouse2} onSelect={setSpouse2} filter={(c) => eligible(c) && c.id !== spouse1?.id} />

      <form className="card" noValidate onSubmit={(e) => { e.preventDefault(); setError(''); setConfirming(true); }}>
        <div className="grid2">
          <Field id="marriage-date" label="Date of marriage" required><input type="date" value={form.date} onChange={update('date')} /></Field>
          <Field id="marriage-place" label="Place of marriage" required><input value={form.place} onChange={update('place')} /></Field>
          <Field id="marriage-witnesses" label="Witnesses" required={false}><input value={form.witnesses} onChange={update('witnesses')} /></Field>
        </div>
        <div className="row"><BackButton /><button className="btn">Register marriage</button></div>
      </form>

      {confirming && (
        <ConfirmDialog title="Register this marriage?" confirmLabel="Register" onConfirm={handleSubmit} onCancel={() => setConfirming(false)}>
          <p>{spouse1?.name || 'No first spouse'} and {spouse2?.name || 'no second spouse'} will be linked.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
