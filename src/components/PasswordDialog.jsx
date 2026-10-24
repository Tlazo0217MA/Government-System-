import { useState } from 'react';
import Field from './Field.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

// Dialog for choosing a new password. `onSave(password)` must return { error } or {}.
export default function PasswordDialog({ title, suggestion, onSave, onClose }) {
  const [password, setPassword] = useState(suggestion);
  const [error, setError] = useState('');

  function handleConfirm() {
    const result = onSave(password.trim());
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
  }

  return (
    <ConfirmDialog title={title} confirmLabel="Save password" onConfirm={handleConfirm} onCancel={onClose}>
      <Field id="new-password" label="New password" required error={error} hint="At least 6 characters. A suggestion is filled in for you.">
        <input value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
    </ConfirmDialog>
  );
}
