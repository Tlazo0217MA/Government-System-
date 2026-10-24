// Decides how much of a citizen record each role may see.
// NOTE: this runs in the browser, so it only demonstrates the intended rules.
// A real system must enforce them on a server.
import { db } from './storage.js';

const FULL_ACCESS_ROLES = ['citizen', 'homeaffairs'];

// Extra details a department officer may REQUEST (Home Affairs must approve).
export const EXTRA_FIELDS = {
  gender: 'Gender',
  pob: 'Place of birth',
  nationality: 'Nationality',
  address: 'Residential address',
  phone: 'Phone number',
  email: 'Email address',
};

// Fields Home Affairs has approved for this officer and this citizen.
export function getApprovedFields(user, citizenId) {
  const approved = db().accessRequests
    .filter((r) => r.status === 'Approved' && r.requesterId === user.id && r.citizenId === citizenId)
    .flatMap((r) => r.fields);
  return [...new Set(approved)];
}

export function getVisibleCitizen(user, citizen) {
  if (!citizen) return null;
  if (FULL_ACCESS_ROLES.includes(user.role)) return citizen;

  // Default for department officers: photo, full name, National ID, date of birth,
  // and whether the person is alive. The cause and details of a death stay with Home Affairs.
  const visible = {
    id: citizen.id,
    name: citizen.name,
    nationalId: citizen.nationalId,
    dob: citizen.dob,
    photo: citizen.photo,
    verification: citizen.verification,
    status: citizen.status || 'Alive',
    dateOfDeath: user.role === 'pensions' ? citizen.dateOfDeath : '',
    restricted: true,
    approvedFields: getApprovedFields(user, citizen.id),
  };
  visible.approvedFields.forEach((field) => { visible[field] = citizen[field]; });
  return visible;
}
