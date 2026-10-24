import { useState } from 'react';
import { FaCamera, FaExclamationTriangle } from 'react-icons/fa';
import { fileToSmallPhoto } from '../utils/image.js';
import CitizenPhoto from './CitizenPhoto.jsx';

const MAX_BYTES = 5 * 1024 * 1024;

// Citizen photo picker. Shows a preview and returns a small JPEG data URL.
export default function PhotoUpload({ id, value, onChange, error, required = true }) {
  const [localError, setLocalError] = useState('');

  async function handleSelect(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;

    if (!/^image\/(jpeg|png)$/.test(file.type)) {
      setLocalError('The photo must be a JPG or PNG image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError('The photo is larger than 5 MB. Choose a smaller photo.');
      return;
    }
    try {
      setLocalError('');
      onChange(await fileToSmallPhoto(file));
    } catch (err) {
      setLocalError(err.message);
    }
  }

  const message = localError || error;
  return (
    <div className="upload photo-upload">
      <label htmlFor={id}>
        <FaCamera aria-hidden="true" /> Citizen photo{required ? <span className="req"> (required)</span> : <span className="opt"> (optional)</span>}
      </label>
      <div className="row">
        <CitizenPhoto photo={value} name="the citizen being registered" size={96} />
        <input id={id} type="file" accept="image/png,image/jpeg" onChange={handleSelect} aria-invalid={!!message} />
      </div>
      {message && (
        <p role="alert" className="err">
          <FaExclamationTriangle aria-hidden="true" /> {message}
        </p>
      )}
      <small>Clear, front-facing photo. JPG or PNG, up to 5 MB. It is resized and saved in this browser only.</small>
    </div>
  );
}
