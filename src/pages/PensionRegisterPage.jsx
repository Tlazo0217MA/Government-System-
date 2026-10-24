import { useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { addToRegister } from '../services/pensionService.js';
import { getVisibleCitizen } from '../services/permissions.js';
import { idText } from '../config/rules.js';
import { formatDateTime } from '../utils/dates.js';
import StatusBadge from '../components/StatusBadge.jsx';
import CitizenPhoto from '../components/CitizenPhoto.jsx';
import CitizenPicker from '../components/CitizenPicker.jsx';
import { Breadcrumbs, EmptyState } from '../components/Navigation.jsx';

// The register of pension beneficiaries. The Alive / Deceased column is NOT copied:
// it reads the citizen's status from Home Affairs live, so a registered death shows here at once.
export default function PensionRegisterPage() {
  const { user } = useApp();
  const data = useDb();
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState('');

  const entries = data.pensionRegister.map((entry) => ({
    entry,
    citizen: getVisibleCitizen(user, data.citizens.find((c) => c.id === entry.citizenId)),
  }));
  const deceased = entries.filter((e) => e.citizen.status === 'Deceased');

  function handleAdd() {
    const result = addToRegister(user, picked.id);
    setError(result.error || '');
    if (!result.error) setPicked(null);
  }

  return (
    <>
      <Breadcrumbs items={[['Pension Register']]} />
      <h1>Pension register</h1>

      {deceased.length > 0 && (
        <p role="alert" className="err">
          <FaExclamationTriangle aria-hidden="true" /> {deceased.length} registered beneficiar{deceased.length === 1 ? 'y is' : 'ies are'} deceased according to Home Affairs. Their payments are stopped.
        </p>
      )}

      <section className="card">
        <h2>Add a person to the register</h2>
        {error && <p role="alert" className="err">{error}</p>}
        <CitizenPicker id="register-citizen" label="Citizen" selected={picked} onSelect={setPicked} filter={(c) => c.status === 'Alive'} />
        {picked && <button className="btn" onClick={handleAdd}>Add to pension register</button>}
        <p><small>People are also added automatically when they submit a pension application.</small></p>
      </section>

      {entries.length === 0 ? <EmptyState>No one is registered yet.</EmptyState> : (
        <div className="scroll">
          <table>
            <thead><tr><th>Photo</th><th>Name</th><th>National ID</th><th>Date of birth</th><th>Life status</th><th>Date of death</th><th>Payments</th><th>Registered</th></tr></thead>
            <tbody>
              {entries.map(({ entry, citizen }) => (
                <tr key={entry.citizenId}>
                  <td><CitizenPhoto photo={citizen.photo} name={citizen.name} size={48} /></td>
                  <td>{citizen.name}</td>
                  <td>{idText(citizen)}</td>
                  <td>{citizen.dob}</td>
                  <td><StatusBadge status={citizen.status} /></td>
                  <td>{citizen.dateOfDeath || '-'}</td>
                  <td><StatusBadge status={entry.paymentsStopped ? 'Stopped' : 'Registered'} /> {entry.paymentsStopped ? 'Stopped' : 'Active'}</td>
                  <td>{formatDateTime(entry.registeredOn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
