import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaPlus, FaLock } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { listRecords } from '../services/recordService.js';
import { RECORD_TYPES } from '../config/recordTypes.js';
import { formatDateTime } from '../utils/dates.js';
import Field from '../components/Field.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { Breadcrumbs, EmptyState } from '../components/Navigation.jsx';

// List of one record type for the officer's own department (the "Read" in CRUD).
export default function RecordsPage() {
  const { typeKey } = useParams();
  const { user } = useApp();
  const data = useDb();
  const type = RECORD_TYPES[typeKey];
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  if (!type || type.dept !== user.role) {
    return <EmptyState><FaLock aria-hidden="true" /> Not available for your department.</EmptyState>;
  }

  const nameOf = (id) => data.citizens.find((c) => c.id === id)?.name || id;
  const rows = listRecords(user, typeKey)
    .filter((r) => showArchived || !r.archived)
    .filter((r) => {
      const text = query.trim().toLowerCase();
      if (!text) return true;
      return r.ref.toLowerCase().includes(text) || nameOf(r.citizenId).toLowerCase().includes(text)
        || Object.values(r.data).some((v) => String(v).toLowerCase().includes(text));
    });

  return (
    <>
      <Breadcrumbs items={[[type.plural]]} />
      <h1>{type.plural}</h1>
      <p>{type.help}</p>
      <Link className="btn" to={`/staff/records/${typeKey}/new`}><FaPlus aria-hidden="true" /> New {type.title.toLowerCase()}</Link>

      <div className="row">
        <Field id="record-query" label="Search" required={false}><input value={query} onChange={(e) => setQuery(e.target.value)} /></Field>
        <label className="check"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived</label>
      </div>

      {rows.length === 0 ? <EmptyState>Nothing here yet.</EmptyState> : (
        <div className="scroll">
          <table>
            <thead>
              <tr><th>Reference</th><th>Citizen</th>{type.fields.slice(0, 2).map((f) => <th key={f.key}>{f.label}</th>)}<th>Created</th><th>Status</th><th><span className="sr">Action</span></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ref}>
                  <td>{r.ref}</td>
                  <td>{nameOf(r.citizenId)}</td>
                  {type.fields.slice(0, 2).map((f) => <td key={f.key}>{r.data[f.key]}</td>)}
                  <td>{formatDateTime(r.created)}</td>
                  <td><StatusBadge status={r.status} />{r.archived && ' (archived)'}{r.flag && <> <StatusBadge status="Deceased" /></>}</td>
                  <td><Link className="btn sm" to={`/staff/records/${typeKey}/${r.ref}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
