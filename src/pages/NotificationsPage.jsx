import { Link } from 'react-router-dom';
import { FaBell } from 'react-icons/fa';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';
import { markAllRead } from '../services/notificationService.js';
import { formatDateTime } from '../utils/dates.js';
import { Breadcrumbs, EmptyState } from '../components/Navigation.jsx';

export default function NotificationsPage() {
  const { user } = useApp();
  const data = useDb();
  const notifications = data.notifications.filter((n) => n.citizenId === user.citizenId);

  return (
    <>
      <Breadcrumbs items={[['Notifications']]} />
      <h1>Notifications</h1>
      <button className="btn ghost" onClick={() => markAllRead(user.citizenId)}>Mark all as read</button>

      {notifications.length === 0 ? (
        <EmptyState>No notifications yet.</EmptyState>
      ) : (
        <ul className="notes" aria-live="polite">
          {notifications.map((n) => (
            <li key={n.id} className={n.read ? '' : 'unread'}>
              <FaBell aria-hidden="true" /> {!n.read && <strong>New: </strong>}
              {n.msg} <Link to={`/applications/${n.ref}`}>{n.ref}</Link>{' '}
              <small>{formatDateTime(n.time)}</small>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
