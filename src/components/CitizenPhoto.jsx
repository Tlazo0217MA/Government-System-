import { FaUserCircle } from 'react-icons/fa';

// Shows the citizen's photo, or a placeholder icon when no photo exists.
export default function CitizenPhoto({ photo, name, size = 64 }) {
  if (!photo) {
    return <FaUserCircle size={size} aria-label={`No photo for ${name}`} role="img" className="photo-placeholder" />;
  }
  return (
    <img
      src={photo}
      alt={`Photo of ${name}`}
      width={size}
      height={size}
      className="citizen-photo"
    />
  );
}
