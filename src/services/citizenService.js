import { db, save, makeId } from './storage.js';
import { logAction } from './auditService.js';

// Creates a readable temporary password such as "Cit-4821".
function generatePassword() {
  return 'Cit-' + Math.floor(1000 + Math.random() * 9000);
}

// Registers a citizen AND creates their login account.
// The citizen cannot log in until a Home Affairs officer verifies them.
export function addCitizen(actor, form) {
  const data = db();

  if (data.citizens.some((c) => c.nationalId === form.nationalId)) {
    return { error: 'A citizen with this National ID is already registered.' };
  }

  const nextNumber = Math.max(0, ...data.citizens.map((c) => Number(c.id.slice(2)))) + 1;
  const id = 'C-' + String(nextNumber).padStart(4, '0');

  const citizen = {
    ...form,
    id,
    name: [form.firstName, form.middleName, form.surname].filter(Boolean).join(' '),
    status: 'Alive',
    dateOfDeath: '',
    parents: [],
    verification: 'Pending Verification',
    registered: new Date().toISOString(),
  };
  data.citizens.push(citizen);

  const credentials = { username: form.nationalId, password: generatePassword() };
  data.users.push({
    id: makeId('u'),
    username: credentials.username,
    password: credentials.password,
    name: citizen.name,
    role: 'citizen',
    citizenId: id,
  });

  logAction(actor, 'Registered citizen', id);
  save();
  return { citizen, credentials };
}

export function updateContactDetails(actor, citizenId, patch) {
  Object.assign(db().citizens.find((c) => c.id === citizenId), patch);
  logAction(actor, 'Updated citizen record', citizenId);
  save();
}

export function updateAccessibilityNeeds(actor, citizenId, accessibility) {
  db().citizens.find((c) => c.id === citizenId).accessibility = accessibility;
  logAction(actor, 'Updated accessibility needs', citizenId);
  save();
}

// Verifying a citizen is what allows them to log in.
export function verifyCitizen(actor, citizenId) {
  db().citizens.find((c) => c.id === citizenId).verification = 'Verified';
  logAction(actor, 'Verified citizen identity', citizenId);
  save();
}

export function requestCorrection(actor, citizenId) {
  logAction(actor, 'Requested profile correction', citizenId);
  save();
}

// Home Affairs can change a citizen's password (for example when it is forgotten).
export function setCitizenPassword(actor, citizenId, newPassword) {
  if (newPassword.length < 6) return { error: 'Use at least 6 characters.' };
  const account = db().users.find((u) => u.citizenId === citizenId);
  if (!account) return { error: 'This citizen has no login yet (no National ID).' };
  account.password = newPassword;
  logAction(actor, 'Changed citizen password', citizenId);
  save();
  return {};
}

// Suggests a new readable temporary password.
export function suggestPassword() {
  return generatePassword();
}

export function getCitizenAccount(citizenId) {
  return db().users.find((u) => u.citizenId === citizenId) || null;
}

// Search by name, National ID, citizen reference (C-0001) or a civil registration
// reference (BRN-, MAR-, DTH-, NID-). An empty query returns everyone.
export function searchCitizens(query) {
  const text = (query || '').trim().toLowerCase();
  const data = db();
  if (!text) return data.citizens;
  const idsFromRecords = data.civilRecords
    .filter((r) => r.ref.toLowerCase().includes(text))
    .flatMap((r) => r.citizenIds);
  return data.citizens.filter((c) =>
    c.name.toLowerCase().includes(text)
    || (c.nationalId && c.nationalId.includes(text))
    || c.id.toLowerCase() === text
    || idsFromRecords.includes(c.id)
  );
}
