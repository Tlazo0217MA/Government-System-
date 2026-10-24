import { Link, useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaChevronRight } from 'react-icons/fa';

// "Home > Services > Passport" trail. Each item is [label, link?].
export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      <Link to="/"><FaHome aria-hidden="true" /> Home</Link>
      {items.map(([label, link]) => (
        <span key={label}>
          <FaChevronRight aria-hidden="true" />
          {link ? <Link to={link}>{label}</Link> : <span aria-current="page">{label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function BackButton() {
  const navigate = useNavigate();
  return (
    <button type="button" className="btn ghost" onClick={() => navigate(-1)}>
      <FaArrowLeft aria-hidden="true" /> Back
    </button>
  );
}

export function EmptyState({ children }) {
  return <div className="empty">{children}</div>;
}

// Extra plain-language help, shown only to citizens whose profile asks for simple guidance.
export function Hint({ children }) {
  return <p className="hint" role="note"><strong>Help:</strong> {children}</p>;
}
