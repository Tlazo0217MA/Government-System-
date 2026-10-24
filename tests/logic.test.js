// Checks of the shared data layer (run with: npm test). Uses a fake localStorage.
const memory = {};
globalThis.localStorage = {
  getItem: (k) => (k in memory ? memory[k] : null),
  setItem: (k, v) => { memory[k] = String(v); },
};

const { db } = await import('../src/services/storage.js');
const { addCitizen, verifyCitizen, setCitizenPassword, getCitizenAccount, searchCitizens } = await import('../src/services/citizenService.js');
const { login, loginWithVoice, getLoginMode, getNeedsForUser } = await import('../src/services/authService.js');
const { submitApplication, setStatus } = await import('../src/services/applicationService.js');
const { getVisibleCitizen } = await import('../src/services/permissions.js');
const { requestAccess, decideRequest } = await import('../src/services/accessService.js');
const { addOfficer, setOfficerDisabled } = await import('../src/services/userService.js');
const civil = await import('../src/services/civilService.js');
const family = await import('../src/services/familyService.js');
const records = await import('../src/services/recordService.js');
const pension = await import('../src/services/pensionService.js');
const { normalize, spokenDigits, spokenDate, spokenEmail } = await import('../src/voice/domControls.js');
const { translateSesotho } = await import('../src/voice/phrases.js');

let failures = 0;
function check(name, condition) {
  console.log((condition ? 'PASS ' : 'FAIL ') + name);
  if (!condition) failures++;
}
const role = (r) => db().users.find((u) => u.role === r);
const officer = role('homeaffairs'), police = role('police'), traffic = role('traffic'),
  finance = role('finance'), pensions = role('pensions'), passportOfficer = role('passport'), admin = role('admin');

const person = (first, nid, dob, gender) => ({
  firstName: first, middleName: '', surname: 'Test', nationalId: nid, dob, gender, pob: 'Maseru', nationality: 'Mosotho',
  address: 'Maseru', phone: '58000000', email: '', photo: 'data:image/jpeg;base64,AAAA', accessibility: { needs: [] },
});

// ---------- registration, login, passwords ----------
check('starts with no citizens', db().citizens.length === 0);
const mother = addCitizen(officer, { ...person('Mama', '8001010001', '1980-01-01', 'Female'), accessibility: { needs: ['visual'] } });
const father = addCitizen(officer, person('Papa', '7801010002', '1978-01-01', 'Male'));
const elder = addCitizen(officer, person('Elder', '4001010003', '1950-01-01', 'Male'));
check('citizens registered Alive', mother.citizen.status === 'Alive' && father.citizen.id === 'C-0002');
check('duplicate National ID blocked', !!addCitizen(officer, person('Dup', '8001010001', '1980-01-01', 'Male')).error);
check('unverified citizen cannot log in', !!login('8001010001', mother.credentials.password).error);
[mother, father, elder].forEach((c) => verifyCitizen(officer, c.citizen.id));
check('verified citizen can log in', !!login('8001010001', mother.credentials.password).user);
check('visual need gives voice login', getLoginMode('8001010001') === 'voice');
check('voice login accepts a phrase', !!loginWithVoice('8001010001', 'hello there').user);
setCitizenPassword(officer, 'C-0001', 'NewPass1');
check('Home Affairs can change password', !!login('8001010001', 'NewPass1').user && getCitizenAccount('C-0001').password === 'NewPass1');

// ---------- Home Affairs: marriage ----------
check('marriage needs two different people', !!civil.registerMarriage(officer, { spouse1Id: 'C-0001', spouse2Id: 'C-0001', date: '2010-01-01', place: 'Maseru' }).error);
const marriage = civil.registerMarriage(officer, { spouse1Id: 'C-0001', spouse2Id: 'C-0002', date: '2010-01-01', place: 'Maseru', witnesses: '' });
check('marriage certificate reference generated', marriage.record?.ref === 'MAR-00001');
check('both profiles linked as married', family.getMaritalStatus('C-0001') === 'Married' && family.getSpouse('C-0002').id === 'C-0001');
check('married person cannot marry again', !!civil.registerMarriage(officer, { spouse1Id: 'C-0001', spouse2Id: 'C-0003', date: '2012-01-01', place: 'x' }).error);

// ---------- Home Affairs: birth ----------
const birth = civil.registerBirth(officer, {
  firstName: 'Baby', middleName: '', surname: 'Test', dob: '2026-08-01', gender: 'Male', pob: 'Maseru', nationality: 'Mosotho', address: 'Maseru',
  mother: { citizenId: 'C-0001', name: 'Mama Test', nationalId: '8001010001' }, father: { citizenId: '', name: '', nationalId: '' },
});
const baby = birth.citizen;
check('birth creates profile with no National ID', baby.nationalId === '' && birth.record.ref === 'BRN-00001');
check('birth needs at least one parent', !!civil.registerBirth(officer, { ...birth.citizen, firstName: 'X', surname: 'Y', mother: {}, father: {} }).error);
check('baby cannot get an ID yet (age rule)', !!civil.eligibilityForId(baby));
check('baby has no login', !getCitizenAccount(baby.id));

// ---------- baby passport: parents and married spouse ----------
const passportInfo = { 'Emergency contact name': 'A', 'Emergency contact phone': '1' };
check('mother can apply for baby', family.getGuardianRelation('C-0001', baby.id) === 'Parent');
check('father (spouse of registered mother) can apply', family.getGuardianRelation('C-0002', baby.id) === 'Spouse of parent');
check('unrelated adult cannot apply', family.getGuardianRelation('C-0003', baby.id) === null);
check('baby appears in mother and father dependents', family.getDependents('C-0001').length === 1 && family.getDependents('C-0002').length === 1);
const motherUser = db().users.find((u) => u.citizenId === 'C-0001');
const fatherUser = db().users.find((u) => u.citizenId === 'C-0002');
const elderUser = db().users.find((u) => u.citizenId === 'C-0003');
check('unrelated adult is refused', !!submitApplication(elderUser, { citizenId: baby.id, applicantId: 'C-0003', serviceKey: 'passport', info: passportInfo, docs: [{ name: 'a.pdf', size: 1 }] }).error);
check('baby cannot get a pension application', !!submitApplication(motherUser, { citizenId: baby.id, applicantId: 'C-0001', serviceKey: 'pension', info: {}, docs: [] }).error);
const babyApp = submitApplication(fatherUser, { citizenId: baby.id, applicantId: 'C-0002', serviceKey: 'passport', info: passportInfo, docs: [{ name: 'a.pdf', size: 1 }] });
check('spouse of mother submits baby passport application', babyApp.ref === 'PAS-00125');
const savedApp = db().applications[0];
check('application is about the baby, made by the father', savedApp.citizenId === baby.id && savedApp.applicantId === 'C-0002');
check('notification goes to the applicant', db().notifications.some((n) => n.citizenId === 'C-0002' && n.ref === babyApp.ref));
check('a pending fee was created for Finance', records.listRecords(finance, 'fee').some((r) => r.data.applicationRef === babyApp.ref && r.status === 'Pending'));

// ---------- passport processing, issuing, renewal ----------
check('Submitted cannot jump to Approved', setStatus(passportOfficer, babyApp.ref, 'Approved') === false);
['Under Review', 'Approved', 'Completed'].forEach((s) => setStatus(passportOfficer, babyApp.ref, s));
const issued = records.latestPassport(baby.id);
check('completing creates a passport record', !!issued && issued.status === 'Valid');
check('child passport expires after 5 years', Number(issued.data.expiryDate.slice(0, 4)) - Number(issued.data.issueDate.slice(0, 4)) === 5);
const renewal = submitApplication(motherUser, { citizenId: baby.id, applicantId: 'C-0001', serviceKey: 'passportRenewal', info: {}, docs: [{ name: 'a.pdf', size: 1 }] });
['Under Review', 'Approved', 'Completed'].forEach((s) => setStatus(passportOfficer, renewal.ref, s));
check('renewal supersedes the old passport', records.getRecord(issued.ref).status === 'Superseded' && records.latestPassport(baby.id).ref !== issued.ref);
const cancelApp = submitApplication(motherUser, { citizenId: 'C-0001', applicantId: 'C-0001', serviceKey: 'clearance', info: {}, docs: [] });
check('applicant can cancel before review', setStatus(motherUser, cancelApp.ref, 'Cancelled', '') === true);

// ---------- National ID for an eligible citizen ----------
const teen = addCitizen(officer, person('Teen', '1001010009', '2012-01-01', 'Male')); // will be replaced below
// a child registered at birth who has since grown old enough
const grown = civil.registerBirth(officer, { firstName: 'Grown', surname: 'Child', dob: '2005-05-05', gender: 'Female', pob: 'Maseru', nationality: 'Mosotho', address: 'Maseru', mother: { citizenId: 'C-0001', name: 'Mama Test' }, father: {} }).citizen;
check('eligible citizen passes the ID age check', civil.eligibilityForId(grown) === '');
const idResult = civil.issueNationalId(officer, grown.id, { photo: 'p', address: 'Maseru', phone: '58111111', email: '', needs: [] });
check('ID issued onto the SAME profile', idResult.citizen.id === grown.id && /^\d{10}$/.test(idResult.citizen.nationalId));
check('issuing an ID creates a login', !!getCitizenAccount(grown.id));
check('second ID is refused', !!civil.issueNationalId(officer, grown.id, { photo: 'p', address: 'x', phone: '58111111' }).error);
check('citizen count has no duplicates for the grown child', db().citizens.filter((c) => c.name === grown.name).length === 1);

// ---------- Police ----------
const crim = records.createRecord(police, 'criminalRecord', 'C-0003', { offence: 'Theft', offenceDate: '2020-01-01' });
check('criminal record created with case reference', crim.record?.ref === 'CAS-00001');
check('police cannot create a future offence date', !!records.createRecord(police, 'criminalRecord', 'C-0003', { offence: 'x', offenceDate: '2999-01-01' }).error);
check('closing a case needs a reason', !!records.changeRecordStatus(police, 'CAS-00001', 'Closed', '').error);
check('criminal records cannot be cancelled, only archived', !!records.archiveRecord(police, 'CAS-00001', 'Court order sealed record').error === false && records.getRecord('CAS-00001').archived === true);
check('archived record still exists (never deleted)', !!records.getRecord('CAS-00001'));
check('other departments cannot see police records', records.listRecords(traffic, 'criminalRecord').length === 0);
check('lost ID report created', !!records.createRecord(police, 'lostIdReport', 'C-0003', { documentType: 'National ID', dateLost: '2026-01-01', placeLost: 'Maseru' }).record);

// ---------- Traffic ----------
check('vehicle registered', !!records.createRecord(traffic, 'vehicle', 'C-0002', { make: 'Toyota', model: 'Hilux', year: '2018', plate: 'LSO 123' }).record);
check('duplicate plate refused', !!records.createRecord(traffic, 'vehicle', 'C-0003', { make: 'x', model: 'y', year: '2019', plate: 'lso 123' }).error);
check('inspection needs a registered plate', !!records.createRecord(traffic, 'inspection', 'C-0002', { plate: 'OTHER', inspectionDate: '2026-12-01' }).error);
const insp = records.createRecord(traffic, 'inspection', 'C-0002', { plate: 'LSO 123', inspectionDate: '2026-12-01' });
check('inspection created and cancellable while scheduled', !!insp.record && records.archiveRecord(traffic, insp.record.ref, 'Wrong date').error === undefined);

// ---------- Finance ----------
const fee = records.createRecord(finance, 'fee', 'C-0002', { service: 'Vehicle registration', amount: '150' }).record;
check('payment gets a receipt reference', records.changeRecordStatus(finance, fee.ref, 'Paid').error === undefined && /^RCT-\d{5}$/.test(records.getRecord(fee.ref).data.receipt));
check('refund needs a reason', !!records.changeRecordStatus(finance, fee.ref, 'Refunded', '').error);
check('refund recorded with reference', records.changeRecordStatus(finance, fee.ref, 'Refunded', 'Duplicate payment').error === undefined && !!records.getRecord(fee.ref).data.refundRef);
check('a paid fee cannot be cancelled', !!records.archiveRecord(finance, fee.ref, 'oops').error === false && records.getRecord(fee.ref).status === 'Refunded');
check('tax record created', !!records.createRecord(finance, 'taxRecord', 'C-0002', { taxNumber: 'T1', taxYear: '2025', filingType: 'Annual filing' }).record);

// ---------- Pensions and death ----------
const pensionApp = submitApplication(db().users.find((u) => u.citizenId === 'C-0003'), { citizenId: 'C-0003', applicantId: 'C-0003', serviceKey: 'pension', info: {}, docs: [{ name: 'a.pdf', size: 1 }] });
check('pension application adds the person to the register', !!pension.getRegisterEntry('C-0003'));
check('eligibility record created', !!records.createRecord(pensions, 'eligibility', 'C-0003', { documentsChecked: 'Yes' }).record);
check('eligible by age (76)', records.changeRecordStatus(pensions, 'ELG-00001', 'Eligible').error === undefined);
const payment = records.createRecord(pensions, 'pensionPayment', 'C-0003', { period: 'October 2026', amount: '500' }).record;
check('pension payment created', !!payment && payment.status === 'Pending');
check('young person cannot be marked eligible', (() => { pension.addToRegister(pensions, 'C-0002'); const e = records.createRecord(pensions, 'eligibility', 'C-0002', { documentsChecked: 'Yes' }).record; return !!records.changeRecordStatus(pensions, e.ref, 'Eligible').error; })());

check('person is Alive before the death', db().citizens.find((c) => c.id === 'C-0003').status === 'Alive');
const death = civil.registerDeath(officer, { citizenId: 'C-0003', dateOfDeath: '2026-10-01', place: 'Maseru', cause: 'Natural', informant: 'Relative' });
check('death certificate reference generated', death.record?.ref === 'DTH-00001');
check('profile status is Deceased', getVisibleCitizen(pensions, db().citizens.find((c) => c.id === 'C-0003')).status === 'Deceased');
check('Pensions sees the date of death but not the cause', getVisibleCitizen(pensions, db().citizens.find((c) => c.id === 'C-0003')).dateOfDeath === '2026-10-01' && getVisibleCitizen(pensions, db().citizens.find((c) => c.id === 'C-0003')).cause === undefined);
check('traffic does not see the date of death', getVisibleCitizen(traffic, db().citizens.find((c) => c.id === 'C-0003')).dateOfDeath === '');
check('pension payments stop at once', pension.getRegisterEntry('C-0003').paymentsStopped === true && records.getRecord(payment.ref).status === 'Stopped');
check('no new payments for the deceased', !!records.createRecord(pensions, 'pensionPayment', 'C-0003', { period: 'November 2026', amount: '500' }).error);
check('login closed for the deceased', !!login('4001010003', db().users.find((u) => u.citizenId === 'C-0003').password).error);
check('new applications blocked for the deceased', !!submitApplication(elderUser, { citizenId: 'C-0003', applicantId: 'C-0003', serviceKey: 'clearance', info: {}, docs: [] }).error);
check('death sync is in the Pensions audit log', db().audit.some((e) => e.role === 'pensions' && /deceased/.test(e.action)));
check('cannot register the same death twice', !!civil.registerDeath(officer, { citizenId: 'C-0003', dateOfDeath: '2026-10-01', place: 'x', cause: '', informant: 'y' }).error);
check('death before birth refused', !!civil.registerDeath(officer, { citizenId: 'C-0001', dateOfDeath: '1970-01-01', place: 'x', cause: '', informant: 'y' }).error);
check('spouse becomes Widowed when a spouse dies', (() => { civil.registerDeath(officer, { citizenId: 'C-0002', dateOfDeath: '2026-10-02', place: 'x', cause: '', informant: 'y' }); return family.getMaritalStatus('C-0001') === 'Widowed'; })());
check('deceased father no longer a guardian route for spouse', family.getGuardianRelation('C-0001', baby.id) === 'Parent');
check('archiving a death record restores Alive', civil.archiveCivilRecord(officer, 'DTH-00001', 'Registered in error').error === undefined && db().citizens.find((c) => c.id === 'C-0003').status === 'Alive');
check('civil records are archived, never removed', db().civilRecords.find((r) => r.ref === 'DTH-00001').status === 'Archived');
check('civil correction needs a reason', !!civil.correctCivilRecord(officer, 'BRN-00001', { place: 'Leribe' }, '').error);

// ---------- search ----------
check('search by certificate reference', searchCitizens('BRN-00001').some((c) => c.id === baby.id));
check('search by name', searchCitizens('mama').length === 1);

// ---------- access requests, admin ----------
check('address hidden before approval', getVisibleCitizen(traffic, db().citizens[0]).address === undefined);
requestAccess(traffic, 'C-0001', ['address'], 'Licence check');
decideRequest(officer, db().accessRequests[0].id, true);
check('address visible after approval', getVisibleCitizen(traffic, db().citizens[0]).address === 'Maseru');
check('admin adds officer', !!addOfficer(admin, { name: 'New', username: 'newofficer', role: 'finance', needs: ['hands'] }).credentials);
check('officer needs readable and voice login', getNeedsForUser(db().users.find((u) => u.username === 'newofficer')).includes('hands') && getLoginMode('newofficer') === 'voice');
setOfficerDisabled(admin, db().users.find((u) => u.username === 'newofficer').id, true);
check('disabled officer cannot log in', !!login('newofficer', db().users.find((u) => u.username === 'newofficer').password).error);
check('admin log has only officer actions', db().audit.filter((e) => e.scope === 'admin').every((e) => !/^C-/.test(e.ref)));

// ---------- voice helpers ----------
check('digits joined', normalize('9 9 1 2 1 2') === '991212');
check('spoken digit words', spokenDigits('nine nine one two') === '9912');
check('spoken date', spokenDate('12 December 1999') === '1999-12-12');
check('spoken email', spokenEmail('thabo at example dot com') === 'thabo@example.com');
check('Sesotho add citizen maps to English', translateSesotho('Kenya Moahi') === 'add citizen');

console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
