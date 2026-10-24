// Describes every department-owned record type. One generic set of pages
// (list, create, view, update, cancel/archive) is built from this description,
// so each department gets full CRUD without separate code.
//
// field.type: text | textarea | date | number | select
// next:       which statuses may follow each status
// needReason: moving INTO one of these statuses requires a written reason
// cancellable: statuses in which the record may be cancelled (a controlled "delete")
//              Every other record can only be ARCHIVED with a reason. Nothing is ever erased.
export const RECORD_TYPES = {
  criminalRecord: {
    dept: 'police', title: 'Criminal record', plural: 'Criminal records', menu: 'Criminal Records', prefix: 'CAS',
    fields: [
      { key: 'offence', label: 'Alleged or recorded offence', type: 'text', required: true },
      { key: 'offenceDate', label: 'Date of offence', type: 'date', required: true },
      { key: 'courtOutcome', label: 'Court outcome (only if officially recorded)', type: 'text' },
    ],
    statuses: ['Under Investigation', 'Pending Court', 'Closed'],
    initial: 'Under Investigation',
    next: { 'Under Investigation': ['Pending Court', 'Closed'], 'Pending Court': ['Under Investigation', 'Closed'], Closed: [] },
    needReason: ['Closed'],
    cancellable: [],
    editRequiresReason: true,
    archiveLabel: 'Seal or correct (archive)',
    help: 'Criminal records are never deleted. Corrections, sealing or expungement need a reason and are logged.',
  },
  lostIdReport: {
    dept: 'police', title: 'Lost or stolen document report', plural: 'Lost or stolen document reports', menu: 'Lost ID Reports', prefix: 'LST',
    fields: [
      { key: 'documentType', label: 'Document type', type: 'select', options: ['National ID', 'Passport', "Driver's licence", 'Other identity document'], required: true },
      { key: 'dateLost', label: 'Date lost or stolen', type: 'date', required: true },
      { key: 'placeLost', label: 'Place lost or stolen', type: 'text', required: true },
      { key: 'details', label: 'Details', type: 'textarea' },
    ],
    statuses: ['Reported', 'Under Review', 'Referred to Home Affairs', 'Closed'],
    initial: 'Reported',
    next: { Reported: ['Under Review'], 'Under Review': ['Referred to Home Affairs', 'Closed'], 'Referred to Home Affairs': ['Closed'], Closed: [] },
    needReason: ['Closed'],
    cancellable: ['Reported'],
    help: 'The official ID record stays with Home Affairs. This report is linked to the citizen for coordination.',
  },
  vehicle: {
    dept: 'traffic', title: 'Vehicle registration', plural: 'Vehicle registrations', menu: 'Vehicles', prefix: 'VEH',
    fields: [
      { key: 'make', label: 'Make', type: 'text', required: true },
      { key: 'model', label: 'Model', type: 'text', required: true },
      { key: 'year', label: 'Year of manufacture', type: 'number', required: true },
      { key: 'plate', label: 'Registration plate', type: 'text', required: true },
      { key: 'colour', label: 'Colour', type: 'text' },
    ],
    statuses: ['Registered', 'Retired', 'Cancelled'],
    initial: 'Registered',
    next: { Registered: ['Retired', 'Cancelled'], Retired: [], Cancelled: [] },
    needReason: ['Retired', 'Cancelled'],
    cancellable: [],
    help: 'The owner is the citizen selected. Vehicle records stay with Traffic.',
  },
  inspection: {
    dept: 'traffic', title: 'Vehicle inspection', plural: 'Vehicle inspections', menu: 'Inspections', prefix: 'INS',
    fields: [
      { key: 'plate', label: 'Registration plate', type: 'text', required: true },
      { key: 'inspectionDate', label: 'Inspection date', type: 'date', required: true },
      { key: 'defects', label: 'Defects found (if any)', type: 'textarea' },
    ],
    statuses: ['Scheduled', 'Passed', 'Failed', 'Cancelled'],
    initial: 'Scheduled',
    next: { Scheduled: ['Passed', 'Failed', 'Cancelled'], Passed: [], Failed: [], Cancelled: [] },
    needReason: ['Failed', 'Cancelled'],
    cancellable: ['Scheduled'],
    help: 'The plate must belong to a vehicle registered to this citizen.',
  },
  fee: {
    dept: 'finance', title: 'Fee and payment', plural: 'Fees and payments', menu: 'Fees and Payments', prefix: 'FEE',
    fields: [
      { key: 'service', label: 'Service or fee type', type: 'text', required: true },
      { key: 'amount', label: 'Amount (Maloti)', type: 'number', required: true },
      { key: 'description', label: 'Description', type: 'text' },
    ],
    statuses: ['Pending', 'Paid', 'Failed', 'Refunded', 'Cancelled'],
    initial: 'Pending',
    next: { Pending: ['Paid', 'Failed', 'Cancelled'], Failed: ['Pending'], Paid: ['Refunded'], Refunded: [], Cancelled: [] },
    needReason: ['Failed', 'Refunded', 'Cancelled'],
    cancellable: ['Pending'],
    help: 'SIMULATED payments only. No real money moves. Paid fees get a receipt reference and are never deleted.',
  },
  taxRecord: {
    dept: 'finance', title: 'Tax record', plural: 'Tax records', menu: 'Tax Records', prefix: 'TXR',
    fields: [
      { key: 'taxNumber', label: 'Tax number', type: 'text', required: true },
      { key: 'taxYear', label: 'Tax year', type: 'number', required: true },
      { key: 'filingType', label: 'Filing type', type: 'select', options: ['Registration', 'Annual filing'], required: true },
      { key: 'income', label: 'Declared income (Maloti)', type: 'number' },
    ],
    statuses: ['Registered', 'Filed', 'Under Review', 'Accepted', 'Rejected'],
    initial: 'Registered',
    next: { Registered: ['Filed'], Filed: ['Under Review'], 'Under Review': ['Accepted', 'Rejected'], Accepted: [], Rejected: [] },
    needReason: ['Rejected'],
    cancellable: [],
    help: 'Tax records link to the citizen reference. Identity stays with Home Affairs.',
  },
  eligibility: {
    dept: 'pensions', title: 'Eligibility assessment', plural: 'Eligibility assessments', menu: 'Eligibility', prefix: 'ELG',
    fields: [
      { key: 'documentsChecked', label: 'Supporting documents checked', type: 'select', options: ['Yes', 'No'], required: true },
      { key: 'notes', label: 'Assessment notes', type: 'textarea' },
    ],
    statuses: ['Pending', 'Eligible', 'Ineligible'],
    initial: 'Pending',
    next: { Pending: ['Eligible', 'Ineligible'], Eligible: [], Ineligible: [] },
    needReason: ['Ineligible'],
    cancellable: [],
    help: 'A person can only be marked Eligible when they are alive and at or above the pension age.',
  },
  pensionPayment: {
    dept: 'pensions', title: 'Pension payment', plural: 'Pension payments', menu: 'Pension Payments', prefix: 'PPY',
    fields: [
      { key: 'period', label: 'Payment period (for example October 2026)', type: 'text', required: true },
      { key: 'amount', label: 'Amount (Maloti)', type: 'number', required: true },
    ],
    statuses: ['Pending', 'Paid', 'Failed', 'Stopped'],
    initial: 'Pending',
    next: { Pending: ['Paid', 'Failed', 'Stopped'], Failed: ['Pending'], Paid: [], Stopped: [] },
    needReason: ['Failed', 'Stopped'],
    cancellable: [],
    help: 'SIMULATED payments. Payments stop automatically when Home Affairs registers a death.',
  },
  passport: {
    dept: 'passport', title: 'Passport record', plural: 'Passport records', menu: 'Passport Records', prefix: 'PPT',
    fields: [
      { key: 'number', label: 'Passport number', type: 'text', required: true },
      { key: 'issueDate', label: 'Issue date', type: 'date', required: true },
      { key: 'expiryDate', label: 'Expiry date', type: 'date', required: true },
    ],
    statuses: ['Valid', 'Expired', 'Cancelled', 'Superseded', 'Replaced'],
    initial: 'Valid',
    next: { Valid: ['Expired', 'Cancelled'], Expired: [], Cancelled: [], Superseded: [], Replaced: [] },
    needReason: ['Cancelled'],
    cancellable: [],
    help: 'Created automatically when a passport application is completed. Issued passport history is preserved.',
  },
};

export const recordTypesFor = (dept) => Object.entries(RECORD_TYPES).filter(([, type]) => type.dept === dept);
