import { db, makeId } from './storage.js';

// Adds an audit entry. Callers are responsible for calling save() afterwards.
// scope 'admin' marks officer-account management, the only activity an
// administrator may see. Everything else is 'operations' (citizen-related).
export function logAction(actor, action, ref, scope = 'operations') {
  db().audit.unshift({
    id: makeId('A'),
    user: actor.name,
    role: actor.role,
    action,
    ref,
    scope,
    time: new Date().toISOString(),
  });
}
