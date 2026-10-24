import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { submitApplication } from '../services/applicationService.js';
import { latestPassport } from '../services/recordService.js';
import { APPLICATION_QUESTIONS } from '../config/applicationQuestions.js';
import Field from '../components/Field.jsx';
import FileUpload from '../components/FileUpload.jsx';
import CitizenPicker from '../components/CitizenPicker.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Breadcrumbs, BackButton } from '../components/Navigation.jsx';

// An officer captures an application for an existing citizen (including a baby's passport).
export default function StaffNewApplicationPage() {
  const { user } = useApp();
  const data = useDb();
  const navigate = useNavigate();
  const services = data.services.filter((s) => s.dept === user.role && s.enabled);

  const [serviceKey, setServiceKey] = useState(services[0]?.key || '');
  const [citizen, setCitizen] = useState(null);
  const [answers, setAnswers] = useState({});
  const [document, setDocument] = useState(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const questions = APPLICATION_QUESTIONS[serviceKey] || [];
  const needsPassport = ['passportRenewal', 'passportReplacement'].includes(serviceKey);
  const existing = citizen && needsPassport ? latestPassport(citizen.id, ['Valid', 'Expired']) : null;

  function handleSubmit() {
    setConfirming(false);
    const info = {};
    questions.forEach((q) => { info[q] = answers[q]; });
    if (existing) info['Existing passport number'] = existing.data.number;
    if (citizen.birthRef) info['Birth certificate reference'] = citizen.birthRef;
    const result = submitApplication(user, { citizenId: citizen.id, serviceKey, info, docs: [document] });
    if (result.error) { setError(result.error); return; }
    navigate(`/staff/applications/${result.ref}`);
  }

  function handleReview(event) {
    event.preventDefault();
    if (!citizen) { setError('Select a citizen first.'); return; }
    if (needsPassport && !existing) { setError('This citizen has no passport on record. Use a new passport application.'); return; }
    if (questions.some((q) => !(answers[q] || '').trim())) { setError('Answer every question.'); return; }
    if (!document) { setError('Attach a supporting document.'); return; }
    setError('');
    setConfirming(true);
  }

  return (
    <>
      <Breadcrumbs items={[['Applications', '/staff/applications'], ['New application']]} />
      <h1>New application</h1>
      {error && <p role="alert" className="err">{error}</p>}

      <Field id="service" label="Service" required>
        <select value={serviceKey} onChange={(e) => { setServiceKey(e.target.value); setAnswers({}); }}>
          {services.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
        </select>
      </Field>

      <CitizenPicker id="application-citizen" label="Citizen" selected={citizen} onSelect={setCitizen} filter={(c) => c.status === 'Alive'} />
      {existing && <p className="ok">Existing passport retrieved: {existing.data.number}, expires {existing.data.expiryDate}.</p>}

      <form className="card" noValidate onSubmit={handleReview}>
        {questions.map((q, i) => (
          <Field key={q} id={`staff-q-${i}`} label={q} required>
            <input value={answers[q] || ''} onChange={(e) => setAnswers({ ...answers, [q]: e.target.value })} />
          </Field>
        ))}
        <FileUpload id="staff-doc" label="Supporting document" value={document} onChange={setDocument} required />
        <div className="row"><BackButton /><button className="btn">Submit application</button></div>
      </form>

      {confirming && (
        <ConfirmDialog title="Submit this application?" confirmLabel="Submit" onConfirm={handleSubmit} onCancel={() => setConfirming(false)}>
          <p>For {citizen.name}.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
