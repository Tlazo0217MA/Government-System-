import { Breadcrumbs } from '../components/Navigation.jsx';

// A plain description of who can do what (documentation of the prototype's rules).
const ROLES = [
  ['Citizen', 'Own profile, own applications, notifications. Can apply for a passport for a child they are a registered parent of, or the spouse of a registered parent. Cannot edit identity records.'],
  ['Home Affairs officer', 'Central civil registration: births, National IDs, marriages and deaths. Verifies identity, edits citizen details, accessibility needs and passwords, approves access requests, sees all citizen activity. Corrects or archives civil records, never deletes them.'],
  ['Department officers (traffic, finance, pensions, police, passport)', 'Photo, full name, National ID, date of birth and whether the person is alive. Their own department records and applications (Police criminal records, Traffic vehicles, Finance fees, Pensions register, Passport records). Extra details only after Home Affairs approves a request.'],
  ['System administrator', 'Adds, edits, disables officers and resets their passwords. Manages services. Cannot see citizens, applications or citizen activity.'],
];

export default function RolesPage() {
  return (
    <>
      <Breadcrumbs items={[['Roles and Permissions']]} />
      <h1>Roles and permissions</h1>
      <div className="scroll">
        <table>
          <thead><tr><th>Role</th><th>What it can do</th></tr></thead>
          <tbody>
            {ROLES.map(([role, description]) => (
              <tr key={role}><td>{role}</td><td>{description}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p><small>These rules are enforced in the browser for demonstration only. A real system must enforce them on a server.</small></p>
    </>
  );
}
