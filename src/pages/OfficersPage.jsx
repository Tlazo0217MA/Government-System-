import { useState } from 'react';
import { FaUserPlus } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import {
  listOfficers, addOfficer, updateOfficer, setOfficerPassword, setOfficerDisabled, OFFICER_ROLES,
} from '../services/userService.js';
import { needLabel } from '../utils/accessibilityNeeds.js';
import Field from '../components/Field.jsx';
import NeedsCheckboxes from '../components/NeedsCheckboxes.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PasswordDialog from '../components/PasswordDialog.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { Breadcrumbs } from '../components/Navigation.jsx';

const EMPTY_FORM = { name: '', username: '', role: '', needs: [] };

// The administrator manages officer accounts, including their accessibility needs.
export default function OfficersPage() {
  const { user } = useApp();
  useDb(); // re-render when data changes
  const officers = listOfficers();

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);   // credentials of the officer just added
  const [editing, setEditing] = useState(null);   // { id, name, needs }
  const [passwordFor, setPasswordFor] = useState(null);

  function handleAdd(event) {
    event.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = 'Name is required.';
    if (!form.username.trim()) found.username = 'Username is required.';
    if (!form.role) found.role = 'Choose a role.';
    setErrors(found);
    if (Object.keys(found).length) return;

    const result = addOfficer(user, form);
    if (result.error) {
      setErrors({ username: result.error });
      return;
    }
    setCreated(result.credentials);
    setForm(EMPTY_FORM);
    setAdding(false);
  }

  return (
    <>
      <Breadcrumbs items={[['Officers']]} />
      <h1>Officers</h1>
      <button className="btn" onClick={() => { setAdding(!adding); setCreated(null); }}>
        <FaUserPlus aria-hidden="true" /> Add officer
      </button>

      {created && (
        <section className="card" role="status">
          <h2>Officer added</h2>
          <p>Username: <strong>{created.username}</strong></p>
          <p>Temporary password: <strong>{created.password}</strong></p>
          <p>You can see it again in this list. Officers with a recorded need log in by voice.</p>
        </section>
      )}

      {adding && (
        <form className="card" noValidate onSubmit={handleAdd}>
          <h2>New officer</h2>
          <div className="grid2">
            <Field id="officer-name" label="Full name" required error={errors.name}>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field id="officer-username" label="Username" required error={errors.username}>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </Field>
            <Field id="officer-role" label="Role" required error={errors.role}>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="">Select</option>
                {OFFICER_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </Field>
          </div>
          <NeedsCheckboxes needs={form.needs} onChange={(needs) => setForm({ ...form, needs })} />
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn">Save officer</button>
          </div>
        </form>
      )}

      <div className="scroll">
        <table>
          <thead>
            <tr><th>Name</th><th>Username</th><th>Role</th><th>Password</th><th>Accessibility needs</th><th>Status</th><th><span className="sr">Actions</span></th></tr>
          </thead>
          <tbody>
            {officers.map((officer) => (
              <tr key={officer.id}>
                <td>{officer.name}</td>
                <td>{officer.username}</td>
                <td>{officer.role}</td>
                <td>{officer.password}</td>
                <td>{(officer.accessibility?.needs || []).map(needLabel).join('; ') || 'None'}</td>
                <td><StatusBadge status={officer.disabled ? 'Rejected' : 'Verified'} /> {officer.disabled ? 'Disabled' : 'Active'}</td>
                <td className="actions">
                  <button className="btn ghost sm" onClick={() => setEditing({ id: officer.id, name: officer.name, needs: officer.accessibility?.needs || [] })}>Edit</button>
                  <button className="btn ghost sm" onClick={() => setPasswordFor(officer.id)}>Reset password</button>
                  {officer.id !== user.id && (
                    <button className="btn ghost sm" onClick={() => setOfficerDisabled(user, officer.id, !officer.disabled)}>
                      {officer.disabled ? 'Enable' : 'Disable'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ConfirmDialog
          title="Edit officer"
          confirmLabel="Save"
          onCancel={() => setEditing(null)}
          onConfirm={() => { updateOfficer(user, editing.id, editing); setEditing(null); }}
        >
          <Field id="edit-officer-name" label="Full name" required>
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </Field>
          <NeedsCheckboxes needs={editing.needs} onChange={(needs) => setEditing({ ...editing, needs })} />
        </ConfirmDialog>
      )}

      {passwordFor && (
        <PasswordDialog
          title="Reset officer password"
          suggestion={'Off-' + Math.floor(1000 + Math.random() * 9000)}
          onSave={(password) => setOfficerPassword(user, passwordFor, password)}
          onClose={() => setPasswordFor(null)}
        />
      )}
    </>
  );
}
