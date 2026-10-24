import { useState, useRef, useEffect } from 'react';
import Field from './Field.jsx';

// Modal confirmation. Focus starts on Cancel (the safe choice), Escape closes it,
// and an optional required reason can be collected (used for reject / more info).
export default function ConfirmDialog({ title, children, onConfirm, onCancel, confirmLabel = 'Confirm', needReason }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const cancelButton = useRef(null);

  useEffect(() => {
    cancelButton.current?.focus();
  }, []);

  function handleConfirm() {
    if (needReason && !reason.trim()) {
      setError('Please enter a reason.');
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <div className="overlay">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onKeyDown={(event) => event.key === 'Escape' && onCancel()}
      >
        <h2 id="dialog-title">{title}</h2>
        {children}

        {needReason && (
          <Field id="reason" label="Reason" required error={error}>
            <textarea rows="3" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        )}

        <div className="row">
          <button ref={cancelButton} className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn" onClick={handleConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
