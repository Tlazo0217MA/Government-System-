import { useState } from 'react';
import { getSpouse } from '../services/familyService.js';
import Field from './Field.jsx';
import CitizenPicker from './CitizenPicker.jsx';

// Records one parent of a newborn. The parent is either an existing citizen (linked to
// their profile) or, if they have no profile, a name typed in by the officer.
// value = { citizenId, name, nationalId, citizen? }
export default function ParentField({ id, label, value, onChange, suggestion }) {
  const [manual, setManual] = useState(false);

  function pick(citizen) {
    onChange(citizen ? { citizenId: citizen.id, name: citizen.name, nationalId: citizen.nationalId, citizen } : { citizenId: '', name: '', nationalId: '' });
  }

  return (
    <section className="card">
      <h3>{label}</h3>

      {!manual && (
        <>
          <CitizenPicker
            id={`${id}-search`}
            label={label}
            selected={value.citizen || null}
            onSelect={pick}
            filter={(c) => c.status === 'Alive' && !!c.nationalId}
          />
          {!value.citizen && suggestion && (
            <button type="button" className="btn ghost sm" onClick={() => pick(suggestion)}>
              Use {suggestion.name} (spouse of the other parent) as {label.toLowerCase()}
            </button>
          )}
          {!value.citizen && (
            <button type="button" className="btn ghost sm" onClick={() => setManual(true)}>
              {label} is not registered: enter details instead
            </button>
          )}
        </>
      )}

      {manual && (
        <>
          <Field id={`${id}-name`} label={`${label} full name`} required>
            <input value={value.name} onChange={(e) => onChange({ ...value, citizenId: '', name: e.target.value })} />
          </Field>
          <Field id={`${id}-nid`} label={`${label} National ID`} required={false}>
            <input value={value.nationalId} onChange={(e) => onChange({ ...value, nationalId: e.target.value })} />
          </Field>
          <button type="button" className="btn ghost sm" onClick={() => { setManual(false); pick(null); }}>
            Search for the {label.toLowerCase()} instead
          </button>
        </>
      )}
    </section>
  );
}

// Helper used by the birth page: the living spouse of the chosen parent, if any.
export const spouseOf = (parent) => (parent.citizen ? getSpouse(parent.citizen.id) : null);
