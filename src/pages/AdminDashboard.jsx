import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaSync } from 'react-icons/fa';
import { useDb, resetDemo } from '../services/storage.js';
import { toggleService } from '../services/applicationService.js';
import { listOfficers } from '../services/userService.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

// The administrator manages officers and services. Citizen records, applications
// and citizen activity are deliberately NOT shown here.
export default function AdminDashboard() {
  const data = useDb();
  const officers = listOfficers();
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <>
      <h1>System overview</h1>
      <ul className="stats">
        <li className="stat"><strong>{officers.length}</strong>Officer accounts</li>
        <li className="stat"><strong>{officers.filter((o) => !o.disabled).length}</strong>Active</li>
        <li className="stat"><strong>{officers.filter((o) => o.disabled).length}</strong>Disabled</li>
      </ul>
      <p><Link className="btn" to="/admin/officers">Manage officers</Link></p>

      <h2>Services</h2>
      <ul>
        {data.services.map((service) => (
          <li key={service.key}>
            {service.name} ({service.dept}){' '}
            <button className="btn ghost sm" onClick={() => toggleService(service.key)}>
              {service.enabled ? 'Disable' : 'Enable'}
            </button>
          </li>
        ))}
      </ul>

      <h2>Demo data</h2>
      <button className="btn danger" onClick={() => setConfirmingReset(true)}>
        <FaSync aria-hidden="true" /> Reset demo data
      </button>
      {confirmingReset && (
        <ConfirmDialog
          title="Reset all demo data?"
          confirmLabel="Reset"
          onCancel={() => setConfirmingReset(false)}
          onConfirm={() => { resetDemo(); setConfirmingReset(false); }}
        >
          <p>Everything saved in this prototype will be removed, including officers you added.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
