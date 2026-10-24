import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { decideRequest } from '../services/accessService.js';
import { EXTRA_FIELDS } from '../services/permissions.js';
import { formatDateTime } from '../utils/dates.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Breadcrumbs, EmptyState } from '../components/Navigation.jsx';

// Home Affairs decides whether a department officer may see extra citizen details.
export default function AccessRequestsPage() {
  const { user } = useApp();
  const data = useDb();
  const [decision, setDecision] = useState(null); // { request, approve }

  return (
    <>
      <Breadcrumbs items={[['Access Requests']]} />
      <h1>Access requests</h1>
      <p>Department officers see only a citizen's photo, name, National ID and date of birth until you approve more.</p>

      {data.accessRequests.length === 0 ? (
        <EmptyState>No requests yet.</EmptyState>
      ) : (
        <div className="scroll">
          <table>
            <thead>
              <tr><th>Time</th><th>Officer</th><th>Citizen</th><th>Details requested</th><th>Reason</th><th>Status</th><th><span className="sr">Actions</span></th></tr>
            </thead>
            <tbody>
              {data.accessRequests.map((request) => (
                <tr key={request.id}>
                  <td>{formatDateTime(request.time)}</td>
                  <td>{request.requesterName} ({request.role})</td>
                  <td>{data.citizens.find((c) => c.id === request.citizenId)?.name}</td>
                  <td>{request.fields.map((f) => EXTRA_FIELDS[f]).join(', ')}</td>
                  <td>{request.reason}</td>
                  <td><StatusBadge status={request.status} /></td>
                  <td className="actions">
                    {request.status === 'Pending' && (
                      <>
                        <button className="btn sm" onClick={() => setDecision({ request, approve: true })}>Approve</button>
                        <button className="btn danger sm" onClick={() => setDecision({ request, approve: false })}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {decision && (
        <ConfirmDialog
          title={`${decision.approve ? 'Approve' : 'Reject'} this request?`}
          needReason={!decision.approve}
          confirmLabel={decision.approve ? 'Approve' : 'Reject'}
          onCancel={() => setDecision(null)}
          onConfirm={(note) => { decideRequest(user, decision.request.id, decision.approve, note); setDecision(null); }}
        >
          <p>{decision.request.requesterName} asked for: {decision.request.fields.map((f) => EXTRA_FIELDS[f]).join(', ')}.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
