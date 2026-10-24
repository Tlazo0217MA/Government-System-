// Business rules in one place. These are PROTOTYPE values:
// verify every threshold against current Lesotho law before presenting it as law.
export const NATIONAL_ID_AGE = 16;   // minimum age for a National ID
export const MINOR_AGE = 16;         // below this age a guardian must apply for a passport
export const MARRIAGE_AGE = 18;      // minimum age to register a marriage
export const PENSION_AGE = 70;       // pension eligibility age
export const PASSPORT_YEARS_ADULT = 10;
export const PASSPORT_YEARS_CHILD = 5;

// Whole years between a date of birth and a date (today by default).
export function ageOn(dob, onDate = new Date()) {
  const birth = new Date(dob);
  let age = onDate.getFullYear() - birth.getFullYear();
  const hadBirthday = onDate.getMonth() > birth.getMonth()
    || (onDate.getMonth() === birth.getMonth() && onDate.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

export const today = () => new Date().toISOString().slice(0, 10);

// What to show when a citizen has no National ID yet (for example a baby).
export const idText = (citizen) => citizen?.nationalId || 'No National ID yet';
