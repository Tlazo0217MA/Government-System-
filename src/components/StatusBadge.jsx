import { FaCheckCircle, FaClock, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';

// Statuses grouped by meaning. Each group has its own icon AND colour,
// and the text is always shown, so colour is never the only signal.
const GOOD = ['Approved', 'Completed', 'Verified', 'Alive', 'Valid', 'Paid', 'Passed', 'Registered', 'Accepted', 'Issued', 'Eligible'];
const BAD = ['Rejected', 'Deceased', 'Failed', 'Cancelled', 'Stopped', 'Ineligible'];
const WARN = ['Requires Additional Information', 'Refunded', 'Expired', 'Superseded', 'Replaced', 'Archived', 'Pending Court'];

export default function StatusBadge({ status }) {
  let Icon = FaClock;
  let tone = 'info';
  if (GOOD.includes(status)) { Icon = FaCheckCircle; tone = 'good'; }
  else if (BAD.includes(status)) { Icon = FaTimesCircle; tone = 'bad'; }
  else if (WARN.includes(status)) { Icon = FaExclamationTriangle; tone = 'warn'; }

  return (
    <span className={`badge ${tone}`}>
      <Icon aria-hidden="true" /> {status}
    </span>
  );
}
