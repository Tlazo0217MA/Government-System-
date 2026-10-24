import { useState } from 'react';
import { FaUpload, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Simulated document upload. Only the file name and size are kept; the file is
// never sent anywhere.
export default function FileUpload({ id, label, value, onChange, required }) {
  const [error, setError] = useState('');

  function handleSelect(event) {
    const file = event.target.files[0];
    event.target.value = ''; // lets the user pick the same file again later
    if (!file) return;

    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) {
      setError('Only PDF, JPG or PNG files are accepted.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('This file is larger than 5 MB. Choose a smaller file.');
      return;
    }
    setError('');
    onChange({ name: file.name, size: file.size, added: new Date().toISOString() });
  }

  return (
    <div className="upload">
      <label htmlFor={id}>
        <FaUpload aria-hidden="true" /> {label}
        {required && <span className="req"> (required)</span>}
      </label>
      <input id={id} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleSelect} />

      {value && (
        <p role="status" className="ok">
          <FaCheckCircle aria-hidden="true" /> Attached: {value.name} ({Math.max(1, Math.round(value.size / 1024))} KB)
          <button type="button" className="btn ghost sm" onClick={() => onChange(null)}>Remove</button>
        </p>
      )}
      {error && (
        <p role="alert" className="err">
          <FaExclamationTriangle aria-hidden="true" /> {error}
        </p>
      )}
      {!value && (
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => onChange({ name: 'sample-document.pdf', size: 50 * 1024, added: new Date().toISOString() })}
        >
          Use a sample document (demo, works by voice)
        </button>
      )}
      <small>PDF, JPG or PNG, up to 5 MB. Simulated: the file is not sent anywhere; only its name is saved.</small>
    </div>
  );
}
