import { db, save } from './storage.js';
import { logAction } from './auditService.js';
import { addNotification } from './notificationService.js';
import { createFeeForApplication, issuePassportRecord } from './recordService.js';
import { ensureRegistered } from './pensionService.js';
import { getCitizen, getGuardianRelation, getParentIds } from './familyService.js';
import { PASSPORT_SERVICES } from '../config/applicationQuestions.js';
import { MINOR_AGE, ageOn } from '../config/rules.js';

// Which statuses may follow each status. Anything else is rejected.
// "Cancelled" is for the applicant (or officer on their behalf) before review starts.
export const NEXT_STATUSES = {
  Submitted: ['Under Review', 'Cancelled'],
  'Under Review': ['Approved', 'Rejected', 'Requires Additional Information'],
  'Requires Additional Information': ['Under Review'],
  Approved: ['Completed'],
};

const STATUS_MESSAGES = {
  'Under Review': 'is now under review.',
  'Requires Additional Information': 'needs additional information. Please review the request.',
  Approved: 'status has been updated to Approved.',
  Rejected: 'status has been updated to Rejected.',
  Completed: 'is now Completed.',
  Cancelled: 'has been cancelled.',
};

// Who should receive notifications when a staff member applies for a baby:
// the first parent who has a login, otherwise the child.
function defaultApplicant(subject) {
  const parentWithLogin = getParentIds(subject).find((id) => db().users.some((u) => u.citizenId === id));
  return subject.nationalId ? subject.id : parentWithLogin || subject.id;
}

// subject = the person the service is for (citizenId); applicant = who is applying (applicantId).
// For a baby these are different people.
export function submitApplication(actor, { citizenId, applicantId, serviceKey, info, docs }) {
  const data = db();
  const service = data.services.find((s) => s.key === serviceKey);
  const subject = getCitizen(citizenId);
  const staffMember = actor.role !== 'citizen';

  if (subject.status === 'Deceased') return { error: 'This citizen is deceased. Applications cannot be submitted.' };

  const isMinor = ageOn(subject.dob) < MINOR_AGE;
  if (isMinor && !PASSPORT_SERVICES.includes(serviceKey)) {
    return { error: `Children under ${MINOR_AGE} can only have passport applications.` };
  }
  const applicant = applicantId || (staffMember ? defaultApplicant(subject) : subject.id);
  if (isMinor && !staffMember && !getGuardianRelation(applicant, subject.id)) {
    return { error: 'Only a registered parent, or the spouse of a registered parent, can apply for this child.' };
  }

  // Reference numbers continue from the highest existing number, so they never repeat.
  const highest = Math.max(124, ...data.applications.map((a) => Number(a.ref.split('-')[1])));
  const ref = `${service.prefix}-${String(highest + 1).padStart(5, '0')}`;
  const now = new Date().toISOString();

  const application = {
    ref, citizenId: subject.id, applicantId: applicant, service: serviceKey, dept: service.dept,
    submitted: now, status: 'Submitted', info, docs,
    history: [{ status: 'Submitted', time: now, by: actor.name, note: '' }],
  };
  data.applications.unshift(application);

  if (service.fee > 0) createFeeForApplication(actor, application, service);   // Finance sees the fee
  if (serviceKey === 'pension') ensureRegistered(actor, subject.id);           // Pensions register

  addNotification(applicant, ref, `Your ${service.name.toLowerCase()} request (${ref}) has been submitted successfully.`);
  logAction(actor, 'Submitted application', ref);
  save();
  return { ref };
}

// Changes an application's status if the move is allowed. Returns true on success.
export function setStatus(actor, ref, newStatus, note = '') {
  const application = db().applications.find((a) => a.ref === ref);
  if (!application || !NEXT_STATUSES[application.status]?.includes(newStatus)) return false;

  application.status = newStatus;
  application.history.push({ status: newStatus, time: new Date().toISOString(), by: actor.name, note });

  // A completed passport application creates the issued passport record.
  if (newStatus === 'Completed' && PASSPORT_SERVICES.includes(application.service)) {
    issuePassportRecord(actor, application);
  }

  const reason = note && !['Under Review', 'Cancelled'].includes(newStatus) ? ` Reason: ${note}` : '';
  addNotification(application.applicantId || application.citizenId, ref, `Your application ${ref} ${STATUS_MESSAGES[newStatus]}${reason}`);
  logAction(actor, `Changed status to ${newStatus}`, ref);
  save();
  return true;
}

export function toggleService(serviceKey) {
  const service = db().services.find((s) => s.key === serviceKey);
  service.enabled = !service.enabled;
  save();
}
