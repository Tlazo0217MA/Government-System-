// Family links: spouse, parents, children and who may apply for a child.
// Everything is DERIVED from the civil records, so there is no second copy to keep in step.
import { db } from './storage.js';
import { MINOR_AGE, ageOn } from '../config/rules.js';

export const getCitizen = (id) => db().citizens.find((c) => c.id === id) || null;

// The most recent marriage record that has not been archived or cancelled.
export function getActiveMarriage(citizenId) {
  const marriages = db().civilRecords.filter(
    (r) => r.type === 'Marriage' && r.status === 'Issued' && r.citizenIds.includes(citizenId)
  );
  return marriages[marriages.length - 1] || null;
}

export function getSpouse(citizenId) {
  const marriage = getActiveMarriage(citizenId);
  if (!marriage) return null;
  return getCitizen(marriage.citizenIds.find((id) => id !== citizenId));
}

export function getMaritalStatus(citizenId) {
  const spouse = getSpouse(citizenId);
  if (!spouse) return 'Single';
  return spouse.status === 'Deceased' ? 'Widowed' : 'Married';
}

// Ids of parents who have their own citizen profile.
export const getParentIds = (citizen) => (citizen.parents || []).map((p) => p.citizenId).filter(Boolean);

export const getChildren = (parentId) => db().citizens.filter((c) => getParentIds(c).includes(parentId));

// 'Parent', 'Spouse of parent', or null when this person may not apply for the child.
export function getGuardianRelation(applicantId, subjectId) {
  const subject = getCitizen(subjectId);
  if (!subject || applicantId === subjectId) return null;
  const parentIds = getParentIds(subject);
  if (parentIds.includes(applicantId)) return 'Parent';
  const spouse = getSpouse(applicantId);
  if (spouse && spouse.status === 'Alive' && parentIds.includes(spouse.id)) return 'Spouse of parent';
  return null;
}

// Living children under the minor age that this person may apply for:
// their own children plus the children of their living spouse.
export function getDependents(citizenId) {
  const spouse = getSpouse(citizenId);
  const candidates = [...getChildren(citizenId), ...(spouse?.status === 'Alive' ? getChildren(spouse.id) : [])];
  const unique = [...new Map(candidates.map((c) => [c.id, c])).values()];
  return unique.filter((c) => c.status === 'Alive' && ageOn(c.dob) < MINOR_AGE && getGuardianRelation(citizenId, c.id));
}
