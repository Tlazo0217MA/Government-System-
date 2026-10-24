import { db, save } from './storage.js';
import { logAction } from './auditService.js';

// Adds a citizen to the pension register (does nothing if already there).
// Callers are responsible for calling save().
export function ensureRegistered(actor, citizenId) {
  const data = db();
  if (data.pensionRegister.some((e) => e.citizenId === citizenId)) return false;
  data.pensionRegister.push({
    citizenId,
    registeredOn: new Date().toISOString(),
    registeredBy: actor.name,
    paymentsStopped: false,
    stoppedOn: '',
  });
  logAction(actor, 'Added to pension register', citizenId);
  return true;
}

export function addToRegister(actor, citizenId) {
  const citizen = db().citizens.find((c) => c.id === citizenId);
  if (!citizen) return { error: 'Choose a citizen first.' };
  if (citizen.status === 'Deceased') return { error: 'This citizen is deceased and cannot be added.' };
  if (!ensureRegistered(actor, citizenId)) return { error: 'This citizen is already in the pension register.' };
  save();
  return {};
}

export const getRegisterEntry = (citizenId) => db().pensionRegister.find((e) => e.citizenId === citizenId) || null;
