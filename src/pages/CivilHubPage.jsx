import { Link } from 'react-router-dom';
import { FaBaby, FaIdCard, FaRing, FaFileAlt } from 'react-icons/fa';
import { Breadcrumbs } from '../components/Navigation.jsx';

// Home Affairs central module: three service categories, one citizen profile.
export default function CivilHubPage() {
  return (
    <>
      <Breadcrumbs items={[['Civil Registration']]} />
      <h1>Civil registration</h1>
      <div className="grid">
        <section className="card">
          <h2><FaBaby aria-hidden="true" /> Birth registration</h2>
          <p>Register a newborn, record the parents, create the baby's profile and issue a birth certificate.</p>
          <Link className="btn" to="/staff/civil/birth">Register a birth</Link>
        </section>
        <section className="card">
          <h2><FaIdCard aria-hidden="true" /> National ID</h2>
          <p>Issue an ID number to an eligible citizen who is already registered.</p>
          <Link className="btn" to="/staff/civil/id">Issue National ID</Link>
        </section>
        <section className="card">
          <h2><FaRing aria-hidden="true" /> Marriage registration</h2>
          <p>Link two existing citizens and issue a marriage certificate reference.</p>
          <Link className="btn" to="/staff/civil/marriage">Register a marriage</Link>
        </section>
        <section className="card">
          <h2><FaFileAlt aria-hidden="true" /> Death registration</h2>
          <p>Record a death, issue a death certificate reference and update the profile to Deceased.</p>
          <Link className="btn" to="/staff/civil/death">Register a death</Link>
        </section>
      </div>
      <p><Link to="/staff/civil/records">View, correct or archive civil records</Link></p>
    </>
  );
}
