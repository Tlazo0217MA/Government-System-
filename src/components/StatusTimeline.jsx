import StatusBadge from './StatusBadge.jsx';
import { formatDateTime } from '../utils/dates.js';

export default function StatusTimeline({ history }) {
  return (
    <ol className="timeline" aria-label="Status history">
      {history.map((step, index) => (
        <li key={index}>
          <StatusBadge status={step.status} />
          <span> {formatDateTime(step.time)} by {step.by}</span>
          {step.note && <p>Reason: {step.note}</p>}
        </li>
      ))}
    </ol>
  );
}
