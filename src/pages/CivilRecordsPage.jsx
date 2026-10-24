import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { correctCivilRecord, archiveCivilRecord } from '../services/civilService.js';
import { formatDateTime } from '../utils/dates.js';
import Field from '../components/Field.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Breadcrumbs, EmptyState } from '../components/Navigation.jsx';

const TYPE_NAMES = { Birth: 'Birth certificate', NationalID: 'National ID', Marriage: 'Marriage certificate', Death: 'Death certificate' };

// Home Affairs: read, correct and archive civil records.
// Finalised legal records are never deleted: they are corrected or archived with a reason.
export default function CivilRecordsPage() {
  const { user } = useApp();
  const data = useDb();
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [action, setAction] = useState(null);   // { kind: 'correct' | 'archive', record }
  const [place, setPlace] = useState('');
  const [error, setError] = useState('');

  const nameOf = (id) => data.citizens.find((c) => c.id === id)?.name || id;
  const rows = data.civilRecords
    .filter((r) => showArchived || r.status === 'Issued')
    .filter((r) => {
      const text = query.trim().toLowerCase();
      return !text || r.ref.toLowerCase().includes(text) || r.citizenIds.some((id) => nameOf(id).toLowerCase().includes(text));
    });

  function openAction(kind, record) {
    setAction({ kind, record });
    setPlace(record.details.place || '');
    setError('');
  }

  function handleConfirm(reason) {
    const { kind, record } = action;
    const result = kind === 'correct' ? correctCivilRecord(user, record.ref, { place }, reason) : archiveCivilRecord(user, record.ref, reason);
    if (result.error) { setError(result.error); return; }
    setAction(null);
  }

  return (
    <>
      <Breadcrumbs items={[['Civil Registration', '/staff/civil'], ['Civil Records']]} />
      <h1>Civil records</h1>

      <div className="row">
        <Field id="civil-query" label="Search by reference or name" required={false}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </Field>
        <label className="check"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived</label>
      </div>

      {error && !action && <p role="alert" className="err">{error}</p>}

      {rows.length === 0 ? <EmptyState>No civil records.</EmptyState> : (
        <div className="scroll">
          <table>
            <thead><tr><th>Reference</th><th>Type</th><th>Citizens</th><th>Details</th><th>Issued</th><th>Status</th><th><span className="sr">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((record) => (
                <tr key={record.ref}>
                  <td>{record.ref}</td>
                  <td>{TYPE_NAMES[record.type]}</td>
                  <td>{record.citizenIds.map(nameOf).join(' and ')}</td>
                  <td>
                    {record.details.place && <>Place: {record.details.place}. </>}
                    {record.details.date && <>Date: {record.details.date}. </>}
                    {record.details.dateOfDeath && <>Died: {record.details.dateOfDeath}. Cause: {record.details.cause || 'not recorded'}. </>}
                    {record.details.parents && <>Parents: {record.details.parents.map((p) => p.name).join(', ')}. </>}
                  </td>
                  <td>{formatDateTime(record.time)}</td>
                  <td><StatusBadge status={record.status} /></td>
                  <td className="actions">
                    {record.status === 'Issued' && record.type !== 'NationalID' && (
                      <button className="btn ghost sm" onClick={() => openAction('correct', record)}>Correct</button>
                    )}
                    {record.status === 'Issued' && (
                      <button className="btn ghost sm" onClick={() => openAction('archive', record)}>Archive</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {action && (
        <ConfirmDialog
          title={action.kind === 'correct' ? `Correct ${action.record.ref}` : `Archive ${action.record.ref}`}
          needReason
          confirmLabel={action.kind === 'correct' ? 'Save correction' : 'Archive'}
          onCancel={() => setAction(null)}
          onConfirm={handleConfirm}
        >
          {action.kind === 'correct' ? (
            <Field id="correct-place" label="Place" required><input value={place} onChange={(e) => setPlace(e.target.value)} /></Field>
          ) : (
            <p>The record is hidden from normal lists but kept. {action.record.type === 'Death' ? 'Archiving a death record restores the citizen to Alive and their login; pension payments then need manual review.' : ''}</p>
          )}
          {error && <p role="alert" className="err">{error}</p>}
        </ConfirmDialog>
      )}
    </>
  );
}
