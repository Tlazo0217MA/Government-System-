import { db, save, makeId } from './storage.js';
import { logAction } from './auditService.js';
import { EXTRA_FIELDS } from './permissions.js';

// A department officer asks Home Affairs for extra details about one citizen.
export function requestAccess(actor, citizenId, fields, reason) {
  db().accessRequests.unshift({
    id: makeId('R'),
    citizenId,
    requesterId: actor.id,
    requesterName: actor.name,
    role: actor.role,
    fields,
    reason,
    status: 'Pending',
    time: new Date().toISOString(),
    decidedBy: '',
    decisionNote: '',
  });
  const names = fields.map((f) => EXTRA_FIELDS[f]).join(', ');
  logAction(actor, `Requested extra citizen details (${names})`, citizenId);
  save();
}

// Home Affairs approves or rejects a request. Approved fields become visible
// to that officer for that citizen only.
export function decideRequest(actor, requestId, approve, note = '') {
  const request = db().accessRequests.find((r) => r.id === requestId);
  if (!request || request.status !== 'Pending') return false;
  request.status = approve ? 'Approved' : 'Rejected';
  request.decidedBy = actor.name;
  request.decisionNote = note;
  logAction(actor, `${approve ? 'Approved' : 'Rejected'} access request from ${request.requesterName}`, request.citizenId);
  save();
  return true;
}
