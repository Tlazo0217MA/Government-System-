// Home Affairs civil registration: births, National IDs, marriages and deaths.
// Every service works on the ONE central citizen profile. Nothing creates a second person.
import { db, save, makeId, nextRef } from './storage.js';
import { logAction } from './auditService.js';
import { applyDeathEffects, reverseDeathEffects } from './deathEffects.js';
import { getCitizen, getMaritalStatus } from './familyService.js';
import { NATIONAL_ID_AGE, MARRIAGE_AGE, ageOn, today } from '../config/rules.js';

const newCitizenId = () => 'C-' + String(Math.max(0, ...db().citizens.map((c) => Number(c.id.slice(2)))) + 1).padStart(4, '0');
const fullName = (c) => [c.firstName, c.middleName, c.surname].filter(Boolean).join(' ');

function addCivilRecord(actor, type, prefix, citizenIds, details) {
  const record = {
    ref: nextRef(db().civilRecords, prefix),
    type,
    citizenIds,
    details,
    status: 'Issued',
    issuedBy: actor.name,
    time: new Date().toISOString(),
    history: [],
  };
  db().civilRecords.push(record);
  logAction(actor, `Issued ${type.toLowerCase()} record`, record.ref);
  return record;
}

export const civilRecordsFor = (citizenId) => db().civilRecords.filter((r) => r.citizenIds.includes(citizenId));

// ---------- Service 1: birth registration ----------
// form.mother / form.father: { citizenId, name, nationalId } (citizenId is '' when the parent has no profile)
export function registerBirth(actor, form) {
  if (!form.mother?.name && !form.father?.name) return { error: 'Record at least one parent.' };
  if (form.mother?.citizenId && form.mother.citizenId === form.father?.citizenId) return { error: 'The mother and father cannot be the same person.' };

  const parents = [];
  [['Mother', form.mother], ['Father', form.father]].forEach(([relation, parent]) => {
    if (parent?.name) parents.push({ relation, citizenId: parent.citizenId || '', name: parent.name, nationalId: parent.nationalId || '' });
  });

  const citizen = {
    id: newCitizenId(),
    firstName: form.firstName, middleName: form.middleName || '', surname: form.surname,
    name: fullName(form),
    nationalId: '',                       // a baby has no National ID yet
    dob: form.dob, gender: form.gender, pob: form.pob, nationality: form.nationality,
    address: form.address, phone: '', email: '',
    photo: form.photo || '',
    status: 'Alive', dateOfDeath: '',
    verification: 'Pending Verification',
    registered: new Date().toISOString(),
    parents,
    accessibility: { needs: [] },
  };
  db().citizens.push(citizen);

  const record = addCivilRecord(actor, 'Birth', 'BRN', [citizen.id], {
    dob: form.dob, place: form.pob, parents,
  });
  citizen.birthRef = record.ref;
  logAction(actor, 'Registered newborn citizen profile', citizen.id);
  save();
  return { citizen, record };
}

// ---------- Service 2a: National ID ----------
// Builds a unique 10-digit number from the date of birth plus 4 digits.
function generateNationalId(dob) {
  const d = new Date(dob);
  const prefix = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  let id;
  do { id = prefix + Math.floor(1000 + Math.random() * 9000); } while (db().citizens.some((c) => c.nationalId === id));
  return id;
}

export function eligibilityForId(citizen) {
  if (!citizen) return 'Choose a citizen first.';
  if (citizen.status === 'Deceased') return 'This citizen is deceased.';
  if (citizen.nationalId) return 'This citizen already has a National ID.';
  if (ageOn(citizen.dob) < NATIONAL_ID_AGE) return `Not eligible yet: the minimum age is ${NATIONAL_ID_AGE}.`;
  return '';
}

// Issues the ID onto the EXISTING profile and creates the citizen's login.
export function issueNationalId(actor, citizenId, form) {
  const citizen = getCitizen(citizenId);
  const problem = eligibilityForId(citizen);
  if (problem) return { error: problem };
  if (!form.photo) return { error: 'A photo is required for the National ID.' };

  citizen.nationalId = generateNationalId(citizen.dob);
  citizen.photo = form.photo;
  citizen.address = form.address;
  citizen.phone = form.phone;
  citizen.email = form.email || '';
  citizen.accessibility = { needs: form.needs || [] };

  const credentials = { username: citizen.nationalId, password: 'Cit-' + Math.floor(1000 + Math.random() * 9000) };
  db().users.push({ id: makeId('u'), ...credentials, name: citizen.name, role: 'citizen', citizenId: citizen.id });

  const record = addCivilRecord(actor, 'NationalID', 'NID', [citizen.id], { nationalId: citizen.nationalId });
  logAction(actor, 'Issued National ID onto existing profile', citizen.id);
  save();
  return { citizen, record, credentials };
}

// ---------- Service 2b: marriage ----------
export function registerMarriage(actor, { spouse1Id, spouse2Id, date, place, witnesses }) {
  const a = getCitizen(spouse1Id);
  const b = getCitizen(spouse2Id);
  if (!a || !b) return { error: 'Select both spouses.' };
  if (a.id === b.id) return { error: 'A person cannot marry themselves.' };
  for (const person of [a, b]) {
    if (person.status === 'Deceased') return { error: `${person.name} is deceased.` };
    if (!person.nationalId) return { error: `${person.name} needs a National ID first.` };
    if (ageOn(person.dob) < MARRIAGE_AGE) return { error: `${person.name} is below the minimum marriage age of ${MARRIAGE_AGE}.` };
    if (getMaritalStatus(person.id) === 'Married') return { error: `${person.name} already has an active marriage record.` };
  }
  if (!date || date > today()) return { error: 'Enter a marriage date that is not in the future.' };
  if (!place.trim()) return { error: 'Enter the place of marriage.' };

  const record = addCivilRecord(actor, 'Marriage', 'MAR', [a.id, b.id], { date, place: place.trim(), witnesses: witnesses || '' });
  save();
  return { record };
}

// ---------- Service 3: death ----------
export function registerDeath(actor, { citizenId, dateOfDeath, place, cause, informant }) {
  const citizen = getCitizen(citizenId);
  if (!citizen) return { error: 'Choose a citizen first.' };
  if (citizen.status === 'Deceased') return { error: 'This citizen is already registered as deceased.' };
  if (!dateOfDeath || dateOfDeath > today()) return { error: 'Enter a date of death that is not in the future.' };
  if (dateOfDeath < citizen.dob) return { error: 'The date of death cannot be before the date of birth.' };
  if (!place.trim() || !informant.trim()) return { error: 'Place of death and informant are required.' };

  citizen.status = 'Deceased';
  citizen.dateOfDeath = dateOfDeath;
  const record = addCivilRecord(actor, 'Death', 'DTH', [citizen.id], { dateOfDeath, place: place.trim(), cause: cause.trim(), informant: informant.trim() });
  applyDeathEffects(citizen);   // pension, login, passports and vehicles update in the same save
  save();
  return { citizen, record };
}

// ---------- Update and controlled delete ----------
// Corrections never erase history: each one is appended with its reason.
export function correctCivilRecord(actor, ref, patch, reason) {
  if (!reason.trim()) return { error: 'A reason is required.' };
  const record = db().civilRecords.find((r) => r.ref === ref);
  record.details = { ...record.details, ...patch };
  record.history.push({ time: new Date().toISOString(), by: actor.name, note: `Corrected: ${reason}` });
  logAction(actor, `Corrected ${record.type.toLowerCase()} record`, ref);
  save();
  return {};
}

// Finalised legal records are archived with a reason, never silently deleted.
export function archiveCivilRecord(actor, ref, reason) {
  if (!reason.trim()) return { error: 'A reason is required.' };
  const record = db().civilRecords.find((r) => r.ref === ref);
  if (record.status !== 'Issued') return { error: 'This record is already archived.' };

  record.status = 'Archived';
  record.history.push({ time: new Date().toISOString(), by: actor.name, note: `Archived: ${reason}` });
  if (record.type === 'Death') {
    const citizen = getCitizen(record.citizenIds[0]);
    citizen.status = 'Alive';
    citizen.dateOfDeath = '';
    reverseDeathEffects(citizen);
  }
  logAction(actor, `Archived ${record.type.toLowerCase()} record`, ref);
  save();
  return {};
}
