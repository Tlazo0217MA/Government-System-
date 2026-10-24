import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaUserPlus } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { getVisibleCitizen } from '../services/permissions.js';
import { getCitizenAccount, setCitizenPassword, suggestPassword, searchCitizens } from '../services/citizenService.js';
import { getMaritalStatus } from '../services/familyService.js';
import { idText } from '../config/rules.js';
import { needLabel } from '../utils/accessibilityNeeds.js';
import Field from '../components/Field.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import CitizenPhoto from '../components/CitizenPhoto.jsx';
import PasswordDialog from '../components/PasswordDialog.jsx';
import { Breadcrumbs, EmptyState } from '../components/Navigation.jsx';

export default function CitizenSearchPage() {
  const { user } = useApp();
  const data = useDb();
  const isHomeAffairs = user.role === 'homeaffairs';

  const [text, setText] = useState('');
  // null = no search yet. Home Affairs sees everyone at first; other departments must search.
  const [searched, setSearched] = useState(isHomeAffairs ? '' : null);
  const [passwordFor, setPasswordFor] = useState(null);

  const matches = searched === null ? [] : searchCitizens(searched);

  return (
    <>
      <Breadcrumbs items={[[isHomeAffairs ? 'Citizen Management' : 'Citizen Search']]} />
      <h1>{isHomeAffairs ? 'Citizen management' : 'Citizen search'}</h1>

      {isHomeAffairs && (
        <Link className="btn" to="/staff/citizens/new"><FaUserPlus aria-hidden="true" /> Add Citizen</Link>
      )}

      <form role="search" className="row" onSubmit={(e) => { e.preventDefault(); setSearched(text.trim()); }}>
        <Field id="query" label="Name, National ID or reference" required>
          <input value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <button className="btn"><FaSearch aria-hidden="true" /> Search</button>
      </form>

      {searched !== null && matches.length === 0 && <EmptyState>Citizen not found.</EmptyState>}

      {/* Home Affairs: the full registration record, including login details. */}
      {isHomeAffairs && matches.length > 0 && (
        <div className="scroll">
          <table className="wide">
            <thead>
              <tr>
                <th>Photo</th><th>Reference</th><th>Full name</th><th>National ID</th><th>Date of birth</th>
                <th>Life status</th><th>Marital status</th><th>Gender</th><th>Place of birth</th><th>Nationality</th><th>Address</th><th>Phone</th>
                <th>Email</th><th>Accessibility needs</th><th>Status</th><th>Username</th><th>Password</th>
                <th><span className="sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {matches.map((citizen) => {
                const account = getCitizenAccount(citizen.id);
                return (
                  <tr key={citizen.id}>
                    <td><CitizenPhoto photo={citizen.photo} name={citizen.name} size={56} /></td>
                    <td>{citizen.id}</td>
                    <td>{citizen.name}</td>
                    <td>{idText(citizen)}</td>
                    <td>{citizen.dob}</td>
                    <td><StatusBadge status={citizen.status || 'Alive'} /></td>
                    <td>{getMaritalStatus(citizen.id)}</td>
                    <td>{citizen.gender}</td>
                    <td>{citizen.pob}</td>
                    <td>{citizen.nationality}</td>
                    <td>{citizen.address}</td>
                    <td>{citizen.phone}</td>
                    <td>{citizen.email || 'Not provided'}</td>
                    <td>{(citizen.accessibility?.needs || []).map(needLabel).join('; ') || 'None'}</td>
                    <td><StatusBadge status={citizen.verification} /></td>
                    <td>{account?.username || 'No login yet'}</td>
                    <td>{account?.password || '-'}</td>
                    <td className="actions">
                      <Link className="btn sm" to={`/staff/citizens/${citizen.id}`}>View profile</Link>
                      {account && <button className="btn ghost sm" onClick={() => setPasswordFor(citizen.id)}>Change password</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Other departments: photo, name, National ID and date of birth only. */}
      {!isHomeAffairs && matches.length > 0 && (
        <>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Photo</th><th>Name</th><th>National ID</th><th>Date of birth</th><th>Status</th>
                  <th><span className="sr">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {matches.map((raw) => {
                  const citizen = getVisibleCitizen(user, raw);
                  return (
                    <tr key={citizen.id}>
                      <td><CitizenPhoto photo={citizen.photo} name={citizen.name} size={56} /></td>
                      <td>{citizen.name}</td>
                      <td>{idText(citizen)}</td>
                      <td>{citizen.dob}</td>
                      <td><StatusBadge status={citizen.verification} /> <StatusBadge status={citizen.status || 'Alive'} /></td>
                      <td><Link className="btn sm" to={`/staff/citizens/${citizen.id}`}>View profile</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p><small>Finding a citizen is not official identity verification.</small></p>
        </>
      )}

      {passwordFor && (
        <PasswordDialog
          title="Change citizen password"
          suggestion={suggestPassword()}
          onSave={(password) => setCitizenPassword(user, passwordFor, password)}
          onClose={() => setPasswordFor(null)}
        />
      )}
    </>
  );
}
