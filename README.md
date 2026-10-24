# Integrated Government Services System for Lesotho (HCI prototype)

React + Vite + React Router + React Icons. White base theme. Fictional demo data only.
This is a university HCI prototype, not a real government system.

## Run
    npm install
    npm run dev      (use Chrome or Edge for voice)
    npm run build
    npm test         (87 logic checks on the data layer and voice helpers)

## Logins
Staff and administrator logins are in `Demo-Logins.docx`. There are no pre-made citizens.
Citizen logins come from Home Affairs (Add Citizen, or when a National ID is issued). A baby has no login.
A citizen logs in only after Home Affairs verifies them. Deceased citizens' logins are closed.

## The central rule
One citizen profile, maintained by Home Affairs. Every department links to it by citizen reference and never keeps its own copy of identity.

## Home Affairs (Civil Registration menu)
- **Birth registration:** creates the baby's profile (no National ID yet), parents recorded (linked to existing profiles or typed in), birth certificate reference BRN-.
- **National ID:** pick an existing citizen, age check (16, see rules), capture photo and contact details, ID number issued onto the SAME profile, login created.
- **Marriage:** two existing living adults with IDs (18+), certificate reference MAR-, linked to both profiles. Marital status is derived from the records.
- **Death:** status becomes Deceased, certificate reference DTH-, history kept. In the same save: the citizen's login closes, the pension register and pending pension payments stop, valid passports are cancelled, passports and vehicles are flagged, new applications are blocked.
- **Civil Records page:** search by reference or name, correct (with reason) or archive (with reason). Records are never deleted. Archiving a death record restores the citizen; pension payments then need manual review.
- Citizen search also matches certificate references.

## Baby passports
A child under 16 can only have passport applications. A registered parent, or the living spouse of a registered parent, applies from their own account (My children on the dashboard, or "Who is this passport for?"). The application records the applicant and relationship, the child's birth certificate reference, and the officer sees both. Renewal and replacement start from the passport already on record.

## Departments
- **Police:** clearance applications (officer sees a record check count; the citizen never sees case details), criminal records (CAS-, status, notes, court outcome, never deleted, only archived/sealed with a reason), lost or stolen document reports (LST-).
- **Traffic:** vehicle registration (VEH-, unique plate), licence applications and renewals, inspections (INS-, plate must belong to the citizen).
- **Finance:** fees and payments (FEE-, simulated, receipt RCT- and refund RFD- references, never deleted), tax records (TXR-), automatic fee when an application is submitted.
- **Pensions:** pension register with Alive/Deceased read live from Home Affairs, applications, eligibility assessments (must be alive and 70+), simulated payments (PPY-). Payments stop automatically on a registered death, and the event appears in the Pensions activity log.
- **Passport:** new, renewal and replacement applications; issued passport records (PPT-) created when an application is completed (10 years adult, 5 years child). Officers can also capture an application for a citizen.
All department pages come from one description in `src/config/recordTypes.js` (create, read, update, cancel or archive).

## Role-based access
Departments see photo, full name, National ID, date of birth and whether the person is alive. Pensions also sees the date of death. Cause of death and all other details stay with Home Affairs. Extra details need a request that Home Affairs approves. The administrator manages officers only and sees no citizen data or citizen activity.

## Voice navigation (all users)
Starts automatically (Chrome or Edge). Say the name of anything on screen, fill fields by naming them then speaking the value, "next field", "confirm", "cancel", "go back", "read this page", "what can I say", "stop listening". Voice login for people whose recorded needs include visual, hands or mobility (any spoken phrase is accepted: NOT real voice authentication). Limits: names and numbers are often misheard; passwords cannot be spoken; files cannot be chosen by voice (a sample-document button is offered); Sesotho phrases are a draft. Not yet tested in a real browser.

## Rules to verify before presenting as law
Ages and thresholds are in `src/config/rules.js`: National ID 16, guardian needed under 16, marriage 18, pension 70, passport validity 10/5 years. Verify against current Lesotho law.

## Simulated, not real
Login, permissions, audit log and localStorage (key `igss-v4`) are client-side only and NOT secure. Passwords are shown in plain text for the demo only. Uploads keep only the file name. Payments, fees and receipts are simulated. A real system needs server-enforced authorisation, hashed passwords, encrypted databases, protected file storage, tamper-resistant auditing and government approval.

## Tests performed
- `npm run build` passes.
- `npm test`: 87 checks pass (registration, verified-only login, passwords, marriage, birth, National ID eligibility, baby passport guardians, passport issue/renewal, police, traffic, finance, pensions, the death-to-pension update, access requests, officer management, voice helpers).
- NOT performed: browser testing of screens, microphone and speech, keyboard and screen-reader checks, responsive layout checks.

## Known limitations
Sesotho covers navigation labels only. A newborn's parents can only be linked if they are already registered with a National ID. Lost-ID reports are not automatically sent to Home Affairs staff (they can see them on the citizen profile). No separate Document Verification page.
