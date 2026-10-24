import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { submitApplication } from '../services/applicationService.js';
import { getDependents, getGuardianRelation } from '../services/familyService.js';
import { latestPassport } from '../services/recordService.js';
import { APPLICATION_QUESTIONS, PASSPORT_SERVICES } from '../config/applicationQuestions.js';
import { PENSION_AGE, ageOn, idText } from '../config/rules.js';
import Field from '../components/Field.jsx';
import FileUpload from '../components/FileUpload.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import CitizenPhoto from '../components/CitizenPhoto.jsx';
import { Breadcrumbs, BackButton, EmptyState, Hint } from '../components/Navigation.jsx';

export default function ApplyPage() {
  const { serviceKey } = useParams();
  const [searchParams] = useSearchParams();
  const { user, adaptations } = useApp();
  const data = useDb();
  const navigate = useNavigate();

  const service = data.services.find((s) => s.key === serviceKey && s.enabled);
  const me = data.citizens.find((c) => c.id === user.citizenId);

  // Passport applications can be for yourself or for a child you are a guardian of.
  const isPassport = PASSPORT_SERVICES.includes(serviceKey);
  const dependents = isPassport ? getDependents(me.id) : [];
  const requested = searchParams.get('for');
  const [subjectId, setSubjectId] = useState(dependents.some((d) => d.id === requested) ? requested : me.id);
  const subject = data.citizens.find((c) => c.id === subjectId);
  const forChild = subject.id !== me.id;

  const [answers, setAnswers] = useState({});
  const [document, setDocument] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!service) return <EmptyState>Service not found.</EmptyState>;
  const questions = APPLICATION_QUESTIONS[serviceKey];

  // Renewal and replacement start from the passport already on record.
  const needsExisting = ['passportRenewal', 'passportReplacement'].includes(serviceKey);
  const existing = needsExisting ? latestPassport(subject.id, ['Valid', 'Expired']) : null;
  const relation = forChild ? getGuardianRelation(me.id, subject.id) : '';
  const notYetEligible = serviceKey === 'pension' && ageOn(me.dob) < PENSION_AGE;

  function handleReview(event) {
    event.preventDefault();
    const found = {};
    questions.forEach((q) => { if (!(answers[q] || '').trim()) found[q] = 'This field is required.'; });
    if (!document) found.document = 'Attach a supporting document.';
    setErrors(found);
    if (Object.keys(found).length === 0) setReviewing(true);
  }

  function handleSubmit() {
    setConfirming(false);
    const info = {};
    if (forChild) {
      info['Applying for'] = `${subject.name} (child)`;
      info['Applicant'] = `${me.name} (${relation})`;
      info['Birth certificate reference'] = subject.birthRef || 'Not on record';
    }
    questions.forEach((q) => { info[q] = answers[q]; });
    if (existing) info['Existing passport number'] = existing.data.number;

    const result = submitApplication(user, { citizenId: subject.id, applicantId: me.id, serviceKey, info, docs: [document] });
    if (result.error) { setSubmitError(result.error); setReviewing(false); return; }
    navigate(`/applications/${result.ref}`, { state: { justSubmitted: true } });
  }

  const blocked = needsExisting && !existing;

  return (
    <>
      <Breadcrumbs items={[['Services', '/services'], [service.name]]} />
      <h1>{service.name}</h1>
      {adaptations.simpleGuidance && (
        <Hint>Step 1: check the details below. Step 2: answer the questions. Step 3: attach a document. Step 4: review and submit.</Hint>
      )}
      {submitError && <p role="alert" className="err">{submitError}</p>}

      {dependents.length > 0 && (
        <Field id="subject" label="Who is this passport for?" required>
          <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setReviewing(false); }}>
            <option value={me.id}>Myself</option>
            {dependents.map((d) => <option key={d.id} value={d.id}>My child: {d.name}</option>)}
          </select>
        </Field>
      )}

      <section className="card">
        <h2>From the central profile <span className="tag">Retrieved</span></h2>
        <CitizenPhoto photo={subject.photo} name={subject.name} size={72} />
        <p>{subject.name}, {idText(subject)}, born {subject.dob}.</p>
        {forChild && (
          <>
            <p>Birth certificate reference: {subject.birthRef || 'not on record'}.</p>
            <p>You are applying as: <strong>{relation}</strong>.</p>
          </>
        )}
        {existing && <p>Existing passport: {existing.data.number}, expires {existing.data.expiryDate}.</p>}
        {notYetEligible && <p role="note" className="err">Based on your date of birth you are not yet at the pension age of {PENSION_AGE}. You may still apply and the officer will assess it.</p>}
        {blocked && <p role="alert" className="err">No passport is on record for {subject.name}. Use "New passport application" instead.</p>}
      </section>

      {!blocked && !reviewing && (
        <form className="card" onSubmit={handleReview} noValidate>
          <h2>Information we still need <span className="tag">You provide</span></h2>
          {questions.map((q, i) => (
            <Field key={q} id={`question-${i}`} label={q} required error={errors[q]}>
              <input value={answers[q] || ''} onChange={(e) => setAnswers({ ...answers, [q]: e.target.value })} />
            </Field>
          ))}
          <FileUpload id="document" label="Supporting document" value={document} onChange={setDocument} required />
          {errors.document && <p className="err" role="alert">{errors.document}</p>}
          {service.fee > 0 && <p><small>Fee: M{service.fee} (simulated, collected by Finance).</small></p>}
          <div className="row"><BackButton /><button className="btn">Review application</button></div>
        </form>
      )}

      {reviewing && (
        <section className="card">
          <h2>Review before you submit</h2>
          <dl>
            {forChild && <div><dt>For</dt><dd>{subject.name}</dd></div>}
            {questions.map((q) => <div key={q}><dt>{q}</dt><dd>{answers[q]}</dd></div>)}
            <div><dt>Document</dt><dd>{document.name}</dd></div>
          </dl>
          <div className="row">
            <button className="btn ghost" onClick={() => setReviewing(false)}>Edit</button>
            <button className="btn" onClick={() => setConfirming(true)}>Submit application</button>
          </div>
        </section>
      )}

      {confirming && (
        <ConfirmDialog title="Submit this application?" confirmLabel="Submit" onConfirm={handleSubmit} onCancel={() => setConfirming(false)}>
          <p>You can track it under My Applications.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
