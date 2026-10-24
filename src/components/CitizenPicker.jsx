import { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { searchCitizens } from '../services/citizenService.js';
import { getVisibleCitizen } from '../services/permissions.js';
import { idText } from '../config/rules.js';
import Field from './Field.jsx';
import StatusBadge from './StatusBadge.jsx';
import CitizenPhoto from './CitizenPhoto.jsx';

// Find an EXISTING citizen and select them. Services never create a second profile.
// `filter` limits who can be chosen (for example only living adults).
// Officers only see what their role allows, as everywhere else.
export default function CitizenPicker({ id, label, selected, onSelect, filter = () => true }) {
  const { user } = useApp();
  useDb();
  const [text, setText] = useState('');
  const [searched, setSearched] = useState('');

  if (selected) {
    const shown = getVisibleCitizen(user, selected);
    return (
      <div className="card picked">
        <CitizenPhoto photo={shown.photo} name={shown.name} size={56} />
        <div>
          <strong>{label}: {shown.name}</strong>
          <p>{idText(shown)}, born {shown.dob} <StatusBadge status={shown.status || 'Alive'} /></p>
        </div>
        <button type="button" className="btn ghost sm" onClick={() => onSelect(null)}>Change {label.toLowerCase()}</button>
      </div>
    );
  }

  const results = searched ? searchCitizens(searched).filter(filter).slice(0, 8) : [];

  return (
    <div className="picker">
      <form role="search" className="row" onSubmit={(e) => { e.preventDefault(); setSearched(text.trim()); }}>
        <Field id={id} label={`Find ${label.toLowerCase()} (name, National ID or reference)`} required>
          <input value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <button className="btn"><FaSearch aria-hidden="true" /> Search</button>
      </form>

      {searched && results.length === 0 && <p role="status">No matching citizen found for this step.</p>}

      {results.length > 0 && (
        <div className="scroll">
          <table>
            <thead><tr><th>Photo</th><th>Name</th><th>National ID</th><th>Date of birth</th><th>Status</th><th><span className="sr">Select</span></th></tr></thead>
            <tbody>
              {results.map((raw) => {
                const c = getVisibleCitizen(user, raw);
                return (
                  <tr key={c.id}>
                    <td><CitizenPhoto photo={c.photo} name={c.name} size={48} /></td>
                    <td>{c.name}</td>
                    <td>{idText(c)}</td>
                    <td>{c.dob}</td>
                    <td><StatusBadge status={c.status || 'Alive'} /></td>
                    <td><button type="button" className="btn sm" onClick={() => onSelect(raw)}>Select</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
