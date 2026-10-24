import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaLock, FaExclamationTriangle } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { getRecord, changeRecordStatus, updateRecordData, addRecordNote, archiveRecord } from '../services/recordService.js';
import { getVisibleCitizen } from '../services/permissions.js';
import { RECORD_TYPES } from '../config/recordTypes.js';
import { idText } from '../config/rules.js';
import { formatDateTime } from '../utils/dates.js';
import Field from '../components/Field.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import StatusTimeline from '../components/StatusTimeline.jsx';
import CitizenPhoto from '../components/CitizenPhoto.jsx';
import RecordFields from '../components/RecordFields.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Breadcrumbs, BackButton, EmptyState } from '../components/Navigation.jsx';

const EXTRA_LABELS = { receipt: 'Receipt reference', refundRef: 'Refund reference', applicationRef: 'Application' };

// View, update, add notes to, and cancel/archive one record.
export default function RecordDetailPage() {
  const { typeKey, ref } = useParams();
  const { user } = useApp();
  const data = useDb();
  const type = RECORD_TYPES[typeKey];
  const record = getRecord(ref);

  const [pendingStatus, setPendingStatus] = useState(null);
  const [editing, setEditing] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  if (!type || !record || record.type !== typeKey || record.dept !== user.role) {
    return <EmptyState><FaLock aria-hidden="true" /> Record not found or access denied.</EmptyState>;
  }

  const citizen = getVisibleCitizen(user, data.citizens.find((c) => c.id === record.citizenId));
  const options = type.next[record.status] || [];
  const cancelling = type.cancellable.includes(record.status);

  // Runs a service call; shows its error on the page and closes the dialog either way.
  function run(result, close) {
    setError(result.error || '');
    close();
  }

  return (
    <>
      <Breadcrumbs items={[[type.plural, `/staff/records/${typeKey}`], [record.ref]]} />
      <h1>{type.title} <small>{record.ref}</small></h1>
      <p><StatusBadge status={record.status} />{record.archived && ' Archived'}</p>

      {(record.flag || citizen.status === 'Deceased') && (
        <p role="alert" className="err"><FaExclamationTriangle aria-hidden="true" /> The citizen is registered as deceased by Home Affairs.</p>
      )}
      {error && <p role="alert" className="err">{error}</p>}

      <div className="grid">
        <section className="card">
          <h2>Citizen</h2>
          <CitizenPhoto photo={citizen.photo} name={citizen.name} size={96} />
          <dl>
            <div><dt>Name</dt><dd>{citizen.name}</dd></div>
            <div><dt>National ID</dt><dd>{idText(citizen)}</dd></div>
            <div><dt>Date of birth</dt><dd>{citizen.dob}</dd></div>
            <div><dt>Life status</dt><dd><StatusBadge status={citizen.status} /></dd></div>
          </dl>
        </section>
        <section className="card">
          <h2>Details</h2>
          <dl>
            {type.fields.map((f) => <div key={f.key}><dt>{f.label}</dt><dd>{record.data[f.key] || 'Not recorded'}</dd></div>)}
            {Object.keys(EXTRA_LABELS).filter((k) => record.data[k]).map((k) => <div key={k}><dt>{EXTRA_LABELS[k]}</dt><dd>{record.data[k]}</dd></div>)}
          </dl>
          {!record.archived && <button className="btn ghost" onClick={() => setEditing({ ...record.data, reason: '' })}>Edit details</button>}
        </section>
      </div>

      {!record.archived && options.length > 0 && (
        <div className="row">
          {options.map((next) => <button key={next} className="btn" onClick={() => setPendingStatus(next)}>Mark as {next}</button>)}
        </div>
      )}

      <h2>History</h2>
      <StatusTimeline history={record.history} />

      <section className="card">
        <h2>Notes</h2>
        {record.notes.length === 0 && <p>No notes yet.</p>}
        <ul>{record.notes.map((n, i) => <li key={i}>{n.text} <small>{n.by}, {formatDateTime(n.time)}</small></li>)}</ul>
        <Field id="new-note" label="Add a note" required={false}><textarea rows="2" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <button className="btn ghost" onClick={() => { const r = addRecordNote(user, ref, note); setError(r.error || ''); if (!r.error) setNote(''); }}>Add note</button>
      </section>

      <div className="row">
        <BackButton />
        {!record.archived && (
          <button className="btn danger" onClick={() => setArchiving(true)}>{cancelling ? 'Cancel this record' : type.archiveLabel || 'Archive this record'}</button>
        )}
      </div>

      {pendingStatus && (
        <ConfirmDialog
          title={`Mark as ${pendingStatus}?`}
          needReason={type.needReason.includes(pendingStatus)}
          confirmLabel="Confirm"
          onCancel={() => setPendingStatus(null)}
          onConfirm={(reason) => run(changeRecordStatus(user, ref, pendingStatus, reason), () => setPendingStatus(null))}
        >
          {typeKey === 'fee' && pendingStatus === 'Paid' && <p>Simulated payment: no real money is taken.</p>}
        </ConfirmDialog>
      )}

      {editing && (
        <ConfirmDialog
          title="Edit details"
          needReason={!!type.editRequiresReason}
          confirmLabel="Save"
          onCancel={() => setEditing(null)}
          onConfirm={(reason) => run(updateRecordData(user, ref, editing, reason), () => setEditing(null))}
        >
          <RecordFields type={type} values={editing} onChange={setEditing} idPrefix="edit" />
        </ConfirmDialog>
      )}

      {archiving && (
        <ConfirmDialog
          title={cancelling ? 'Cancel this record?' : 'Archive this record?'}
          needReason
          confirmLabel={cancelling ? 'Cancel record' : 'Archive'}
          onCancel={() => setArchiving(false)}
          onConfirm={(reason) => run(archiveRecord(user, ref, reason), () => setArchiving(false))}
        >
          <p>Official records are never erased. This hides the record and keeps it in the history.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
