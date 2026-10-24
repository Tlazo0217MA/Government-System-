// The extra questions each citizen-facing service asks. Identity details are NOT
// asked again: they come from the citizen's central profile.
export const APPLICATION_QUESTIONS = {
  passport: ['Emergency contact name', 'Emergency contact phone'],
  passportRenewal: ['Reason for renewal'],
  passportReplacement: ['Reason for replacement (lost, stolen or damaged)', 'Date and place it was lost or damaged'],
  licence: ['Licence number (write New for a first licence)', 'Licence class'],
  clearance: ['Purpose of clearance'],
  pension: ['Pension type', 'Preferred payment method'],
  tax: ['Tax number', 'Tax year'],
};

export const PASSPORT_SERVICES = ['passport', 'passportRenewal', 'passportReplacement'];
