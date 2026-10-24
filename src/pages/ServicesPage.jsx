import { Link } from 'react-router-dom';
import { useDb } from '../services/storage.js';
import { Breadcrumbs } from '../components/Navigation.jsx';

export default function ServicesPage() {
  const data = useDb();
  const services = data.services.filter((s) => s.enabled);

  return (
    <>
      <Breadcrumbs items={[['Services']]} />
      <h1>Government services</h1>
      <div className="grid">
        {services.map((service) => (
          <section key={service.key} className="card">
            <h2>{service.name}</h2>
            <p>{service.desc}</p>
            <p><small>Department: {service.dept}</small></p>
            <Link className="btn" to={`/apply/${service.key}`}>Start</Link>
          </section>
        ))}
      </div>
    </>
  );
}
