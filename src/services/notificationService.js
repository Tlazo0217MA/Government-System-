import { db, save, makeId } from './storage.js';

// Adds a notification for a citizen. Callers are responsible for calling save().
export function addNotification(citizenId, applicationRef, message) {
  db().notifications.unshift({
    id: makeId('N'),
    citizenId,
    ref: applicationRef,
    msg: message,
    time: new Date().toISOString(),
    read: false,
  });
}

export function markAllRead(citizenId) {
  db().notifications
    .filter((n) => n.citizenId === citizenId)
    .forEach((n) => { n.read = true; });
  save();
}
