import { db, save, makeId } from './storage.js';
import { logAction } from './auditService.js';

export const OFFICER_ROLES = ['homeaffairs', 'traffic', 'finance', 'pensions', 'police', 'passport'];

function temporaryPassword() {
  return 'Off-' + Math.floor(1000 + Math.random() * 9000);
}

// Officer accounts = every account that is not a citizen.
export function listOfficers() {
  return db().users.filter((u) => u.role !== 'citizen');
}

// Administrator adds an officer. Usernames must be unique across ALL accounts
// (citizen usernames are National IDs).
export function addOfficer(actor, { name, username, role, needs }) {
  const taken = db().users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (taken) return { error: 'That username is already in use.' };

  const password = temporaryPassword();
  db().users.push({
    id: makeId('u'),
    username: username.trim(),
    password,
    name: name.trim(),
    role,
    disabled: false,
    accessibility: { needs },
  });
  logAction(actor, `Added officer account (${role})`, username.trim(), 'admin');
  save();
  return { credentials: { username: username.trim(), password } };
}

export function updateOfficer(actor, userId, { name, needs }) {
  const user = db().users.find((u) => u.id === userId);
  user.name = name.trim();
  user.accessibility = { needs };
  logAction(actor, 'Updated officer account', user.username, 'admin');
  save();
}

export function setOfficerPassword(actor, userId, password) {
  if (password.length < 6) return { error: 'Use at least 6 characters.' };
  const user = db().users.find((u) => u.id === userId);
  user.password = password;
  logAction(actor, 'Reset officer password', user.username, 'admin');
  save();
  return {};
}

export function setOfficerDisabled(actor, userId, disabled) {
  const user = db().users.find((u) => u.id === userId);
  if (user.id === actor.id) return { error: 'You cannot disable your own account.' };
  user.disabled = disabled;
  logAction(actor, disabled ? 'Disabled officer account' : 'Enabled officer account', user.username, 'admin');
  save();
  return {};
}
