import { cloneElement } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

// A labelled form control with required/optional marking, hint and error text.
// The child (input, select or textarea) receives the id and ARIA attributes.
export default function Field({ id, label, error, hint, required, children }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required ? <span className="req"> (required)</span> : <span className="opt"> (optional)</span>}
      </label>

      {cloneElement(children, {
        id,
        'aria-invalid': !!error,
        'aria-describedby': describedBy || undefined,
      })}

      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <p id={`${id}-error`} className="err" role="alert">
          <FaExclamationTriangle aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}
