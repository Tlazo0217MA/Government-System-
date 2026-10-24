import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaLock } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { createRecord } from '../services/recordService.js';
import { RECORD_TYPES } from '../config/recordTypes.js';
import CitizenPicker from '../components/CitizenPicker.jsx';
import RecordFields from '../components/RecordFields.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Breadcrumbs, BackButton, EmptyState } from '../components/Navigation.jsx';

// The "Create" in CRUD: choose an EXISTING citizen, then fill in the record.
export default function RecordNewPage() {
  const { typeKey } = useParams();
  const { user } = useApp();
  const navigate = useNavigate();
  const type = RECORD_TYPES[typeKey];

  const [citizen, setCitizen] = useState(null);
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  if (!type || type.dept !== user.role) {
    return <EmptyState><FaLock aria-hidden="true" /> Not available for your department.</EmptyState>;
  }

  function handleCreate() {
    const result = createRecord(user, typeKey, citizen?.id, values);
    setConfirming(false);
    if (result.error) { setError(result.error); return; }
    navigate(`/staff/records/${typeKey}/${result.record.ref}`);
  }

  return (
    <>
      <Breadcrumbs items={[[type.plural, `/staff/records/${typeKey}`], ['New']]} />
      <h1>New {type.title.toLowerCase()}</h1>
      <p>{type.help}</p>
      {error && <p role="alert" className="err">{error}</p>}

      <CitizenPicker id="record-citizen" label="Citizen" selected={citizen} onSelect={setCitizen} filter={(c) => c.status === 'Alive'} />

      <form className="card" noValidate onSubmit={(e) => { e.preventDefault(); setError(''); setConfirming(true); }}>
        <RecordFields type={type} values={values} onChange={setValues} />
        <div className="row"><BackButton /><button className="btn">Create {type.title.toLowerCase()}</button></div>
      </form>

      {confirming && (
        <ConfirmDialog title={`Create this ${type.title.toLowerCase()}?`} confirmLabel="Create" onConfirm={handleCreate} onCancel={() => setConfirming(false)}>
          <p>It will be linked to {citizen?.name || 'no citizen yet'}.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
