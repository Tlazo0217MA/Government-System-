// Generic create / read / update / cancel-or-archive for department-owned records.
// The record types themselves are described in config/recordTypes.js.
import { db, save, nextRef } from './storage.js';
import { logAction } from './auditService.js';
import { RECORD_TYPES } from '../config/recordTypes.js';
import { PENSION_AGE, PASSPORT_YEARS_ADULT, PASSPORT_YEARS_CHILD, MINOR_AGE, ageOn, today } from '../config/rules.js';
import { getRegisterEntry } from './pensionService.js';

const findCitizen = (id) => db().citizens.find((c) => c.id === id) || null;
export const getRecord = (ref) => db().records.find((r) => r.ref === ref) || null;

// Records a department may see: only its own types.
export const listRecords = (user, typeKey) =>
  db().records.filter((r) => r.dept === user.role && (!typeKey || r.type === typeKey));

export const recordsForCitizen = (user, citizenId) => listRecords(user).filter((r) => r.citizenId === citizenId);

// ---------- Extra rules per record type ----------
// Each returns a message when the action is NOT allowed, or '' when it is.
const CREATE_RULES = {
  vehicle: (data, citizen) => {
    if (!citizen.nationalId) return 'The owner needs a National ID before registering a vehicle.';
    const year = Number(data.year);
    if (!(year >= 1950 && year <= new Date().getFullYear() + 1)) return 'Enter a valid year of manufacture.';
    const plate = data.plate.trim().toLowerCase();
    const taken = db().records.some((r) => r.type === 'vehicle' && !r.archived && r.data.plate.trim().toLowerCase() === plate);
    return taken ? 'A vehicle with this registration plate already exists.' : '';
  },
  inspection: (data, citizen) => {
    const plate = data.plate.trim().toLowerCase();
    const owns = db().records.some((r) => r.type === 'vehicle' && !r.archived && r.citizenId === citizen.id && r.data.plate.trim().toLowerCase() === plate);
    return owns ? '' : 'That plate is not registered to this citizen. Register the vehicle first.';
  },
  fee: (data) => (Number(data.amount) > 0 ? '' : 'Enter an amount greater than zero.'),
  taxRecord: (data, citizen) => (citizen.nationalId ? '' : 'The citizen needs a National ID for tax records.'),
  criminalRecord: (data) => (data.offenceDate > today() ? 'The offence date cannot be in the future.' : ''),
  lostIdReport: (data) => (data.dateLost > today() ? 'The date lost cannot be in the future.' : ''),
  eligibility: (data, citizen) => (getRegisterEntry(citizen.id) ? '' : 'Add the citizen to the pension register first.'),
  pensionPayment: (data, citizen) => {
    const entry = getRegisterEntry(citizen.id);
    if (!entry) return 'Add the citizen to the pension register first.';
    if (entry.paymentsStopped) return 'Payments are stopped for this beneficiary.';
    return Number(data.amount) > 0 ? '' : 'Enter an amount greater than zero.';
  },
};

// Rules checked when a status changes.
function statusRule(record, newStatus, citizen) {
  if (record.type === 'eligibility' && newStatus === 'Eligible') {
    if (citizen.status === 'Deceased') return 'This citizen is deceased and cannot be eligible.';
    if (ageOn(citizen.dob) < PENSION_AGE) return `Not eligible by age: the pension age is ${PENSION_AGE}.`;
  }
  if (record.type === 'pensionPayment' && newStatus === 'Paid') {
    if (citizen.status === 'Deceased') return 'The beneficiary is deceased. Payment blocked.';
    if (getRegisterEntry(citizen.id)?.paymentsStopped) return 'Payments are stopped for this beneficiary.';
  }
  return '';
}

function nextReceipt(field) {
  const used = db().records.map((r) => r.data[field]).filter(Boolean).map((v) => Number(v.split('-')[1]));
  return `${field === 'receipt' ? 'RCT' : 'RFD'}-${String(Math.max(0, ...used) + 1).padStart(5, '0')}`;
}

// ---------- Create ----------
// Callers decide whether to save; this function saves when it succeeds.
export function createRecord(actor, typeKey, citizenId, data, extra = {}) {
  const type = RECORD_TYPES[typeKey];
  const citizen = findCitizen(citizenId);
  if (!citizen) return { error: 'Choose a citizen first.' };
  if (citizen.status === 'Deceased') return { error: 'This citizen is deceased. New records cannot be created.' };

  const missing = type.fields.find((f) => f.required && !String(data[f.key] ?? '').trim());
  if (missing) return { error: `${missing.label} is required.` };
  const problem = CREATE_RULES[typeKey]?.(data, citizen) || '';
  if (problem) return { error: problem };

  const now = new Date().toISOString();
  const record = {
    ref: nextRef(db().records, type.prefix),
    type: typeKey,
    dept: type.dept,
    citizenId,
    data: { ...data, ...extra },
    status: type.initial,
    notes: [],
    history: [{ status: type.initial, time: now, by: actor.name, note: '' }],
    archived: false,
    flag: '',
    created: now,
    createdBy: actor.name,
  };
  db().records.unshift(record);
  logAction(actor, `Created ${type.title.toLowerCase()}`, record.ref);
  save();
  return { record };
}

// ---------- Update ----------
export function changeRecordStatus(actor, ref, newStatus, note = '') {
  const record = getRecord(ref);
  const type = RECORD_TYPES[record.type];
  if (!type.next[record.status]?.includes(newStatus)) return { error: 'That status change is not allowed.' };
  if (type.needReason.includes(newStatus) && !note.trim()) return { error: 'A reason is required.' };
  const problem = statusRule(record, newStatus, findCitizen(record.citizenId));
  if (problem) return { error: problem };

  record.status = newStatus;
  record.history.push({ status: newStatus, time: new Date().toISOString(), by: actor.name, note });
  if (record.type === 'fee' && newStatus === 'Paid') record.data.receipt = nextReceipt('receipt');
  if (record.type === 'fee' && newStatus === 'Refunded') record.data.refundRef = nextReceipt('refundRef');
  logAction(actor, `Changed ${type.title.toLowerCase()} status to ${newStatus}`, ref);
  save();
  return {};
}

export function updateRecordData(actor, ref, data, reason = '') {
  const record = getRecord(ref);
  const type = RECORD_TYPES[record.type];
  const missing = type.fields.find((f) => f.required && !String(data[f.key] ?? '').trim());
  if (missing) return { error: `${missing.label} is required.` };
  if (type.editRequiresReason && !reason.trim()) return { error: 'A reason is required to correct this record.' };

  record.data = { ...record.data, ...data };
  record.history.push({ status: record.status, time: new Date().toISOString(), by: actor.name, note: `Details corrected. ${reason}`.trim() });
  logAction(actor, `Updated ${type.title.toLowerCase()} details`, ref);
  save();
  return {};
}

export function addRecordNote(actor, ref, text) {
  if (!text.trim()) return { error: 'Write a note first.' };
  getRecord(ref).notes.push({ text: text.trim(), by: actor.name, time: new Date().toISOString() });
  logAction(actor, 'Added a note', ref);
  save();
  return {};
}

// ---------- Controlled "delete" ----------
// Cancellable statuses become Cancelled. Everything else is archived (hidden, never erased).
export function archiveRecord(actor, ref, reason) {
  if (!reason.trim()) return { error: 'A reason is required.' };
  const record = getRecord(ref);
  const type = RECORD_TYPES[record.type];
  const cancelling = type.cancellable.includes(record.status) && type.statuses.includes('Cancelled');
  if (cancelling) record.status = 'Cancelled';
  record.archived = true;
  record.history.push({ status: record.status, time: new Date().toISOString(), by: actor.name, note: `${cancelling ? 'Cancelled' : 'Archived'}: ${reason}` });
  logAction(actor, `${cancelling ? 'Cancelled' : 'Archived'} ${type.title.toLowerCase()}`, ref);
  save();
  return {};
}

// ---------- Created by other services ----------
// Callers save afterwards.
export function createFeeForApplication(actor, application, service) {
  const now = new Date().toISOString();
  db().records.unshift({
    ref: nextRef(db().records, 'FEE'),
    type: 'fee',
    dept: 'finance',
    citizenId: application.applicantId,
    data: { service: service.name, amount: service.fee, description: `Fee for application ${application.ref}`, applicationRef: application.ref },
    status: 'Pending',
    notes: [],
    history: [{ status: 'Pending', time: now, by: actor.name, note: '' }],
    archived: false,
    flag: '',
    created: now,
    createdBy: actor.name,
  });
}

// When a passport application is completed, record the issued passport.
// A renewal supersedes the old passport; a replacement marks it Replaced.
export function issuePassportRecord(actor, application) {
  const subject = findCitizen(application.citizenId);
  const now = new Date().toISOString();
  const years = ageOn(subject.dob) < MINOR_AGE ? PASSPORT_YEARS_CHILD : PASSPORT_YEARS_ADULT;
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + years);

  const oldStatus = application.service === 'passportRenewal' ? 'Superseded' : application.service === 'passportReplacement' ? 'Replaced' : '';
  if (oldStatus) {
    db().records
      .filter((r) => r.type === 'passport' && r.citizenId === subject.id && r.status === 'Valid')
      .forEach((r) => {
        r.status = oldStatus;
        r.history.push({ status: oldStatus, time: now, by: actor.name, note: `Application ${application.ref}` });
      });
  }

  const number = 'LS' + Math.floor(1000000 + Math.random() * 9000000);
  db().records.unshift({
    ref: nextRef(db().records, 'PPT'),
    type: 'passport',
    dept: 'passport',
    citizenId: subject.id,
    data: { number, issueDate: today(), expiryDate: expiry.toISOString().slice(0, 10), applicationRef: application.ref },
    status: 'Valid',
    notes: [],
    history: [{ status: 'Valid', time: now, by: actor.name, note: `Issued from ${application.ref}` }],
    archived: false,
    flag: '',
    created: now,
    createdBy: actor.name,
  });
  logAction(actor, 'Recorded issued passport', number);
}

// The newest passport record for a person (used by renewal and replacement).
export function latestPassport(citizenId, statuses = ['Valid']) {
  return db().records.find((r) => r.type === 'passport' && r.citizenId === citizenId && statuses.includes(r.status)) || null;
}
