// Everything that must change the moment Home Affairs registers (or cancels) a death.
// Other departments never keep their own "is this person alive" flag: they read the
// citizen's status live, and this file stops or flags the records that act on it.
import { db } from './storage.js';
import { logAction } from './auditService.js';

const SYSTEM = { name: 'System (Home Affairs death registration)', role: 'pensions' };

export function applyDeathEffects(citizen) {
  const data = db();
  const now = new Date().toISOString();

  // 1. The citizen's login is closed.
  data.users.filter((u) => u.citizenId === citizen.id).forEach((u) => { u.disabled = true; });

  // 2. Pension register: payments stop, and pending payments are marked Stopped.
  const registerEntries = data.pensionRegister.filter((e) => e.citizenId === citizen.id);
  registerEntries.forEach((e) => { e.paymentsStopped = true; e.stoppedOn = now; });
  data.records
    .filter((r) => r.citizenId === citizen.id && r.type === 'pensionPayment' && r.status === 'Pending')
    .forEach((r) => {
      r.status = 'Stopped';
      r.history.push({ status: 'Stopped', time: now, by: SYSTEM.name, note: 'Beneficiary deceased' });
    });

  // 3. Passports and vehicles are flagged; valid passports are cancelled.
  data.records
    .filter((r) => r.citizenId === citizen.id && ['passport', 'vehicle'].includes(r.type))
    .forEach((r) => {
      r.flag = 'Holder deceased';
      if (r.type === 'passport' && r.status === 'Valid') {
        r.status = 'Cancelled';
        r.history.push({ status: 'Cancelled', time: now, by: SYSTEM.name, note: 'Holder deceased' });
      }
    });

  if (registerEntries.length) {
    logAction(SYSTEM, 'Beneficiary registered as deceased: pension payments stopped', citizen.id);
  }
}

// Used only when a death record is cancelled as a correction. Payments are NOT restarted
// automatically: the Pensions officer must review them.
export function reverseDeathEffects(citizen) {
  const data = db();
  data.users.filter((u) => u.citizenId === citizen.id).forEach((u) => { u.disabled = false; });
  data.records.filter((r) => r.citizenId === citizen.id && r.flag === 'Holder deceased').forEach((r) => { r.flag = ''; });
  if (data.pensionRegister.some((e) => e.citizenId === citizen.id)) {
    logAction(SYSTEM, 'Death record cancelled: pension payments need manual review', citizen.id);
  }
}
