import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  FaHome, FaUser, FaFileAlt, FaBell, FaQuestionCircle, FaSearch, FaUserPlus,
  FaHistory, FaCogs, FaThLarge, FaSignOutAlt, FaKey, FaUsers, FaUserShield, FaIdCard, FaBook, FaListAlt,
} from 'react-icons/fa';
import { recordTypesFor } from '../config/recordTypes.js';
import { useApp } from '../context/AppContext.jsx';
import { useDb } from '../services/storage.js';

// Menu items per kind of user: [path, label, icon].
const MENUS = {
  citizen: [
    ['/citizen', 'Dashboard', FaHome],
    ['/citizen/profile', 'My Profile', FaUser],
    ['/services', 'Services', FaThLarge],
    ['/applications', 'My Applications', FaFileAlt],
    ['/notifications', 'Notifications', FaBell],
    ['/help', 'Help', FaQuestionCircle],
  ],
  homeaffairs: [
    ['/staff', 'Dashboard', FaHome],
    ['/staff/citizens', 'Citizen Management', FaSearch],
    ['/staff/citizens/new', 'Add Citizen', FaUserPlus],
    ['/staff/civil', 'Civil Registration', FaIdCard],
    ['/staff/civil/records', 'Civil Records', FaBook],
    ['/staff/applications', 'Applications', FaFileAlt],
    ['/staff/requests', 'Access Requests', FaKey],
    ['/staff/audit', 'Activity Log', FaHistory],
  ],
  staff: [
    ['/staff', 'Dashboard', FaHome],
    ['/staff/citizens', 'Citizen Search', FaSearch],
    ['/staff/applications', 'Applications', FaFileAlt],
    ['/staff/audit', 'Activity Log', FaHistory],
  ],
  admin: [
    ['/admin', 'Dashboard', FaCogs],
    ['/admin/officers', 'Officers', FaUsers],
    ['/admin/roles', 'Roles and Permissions', FaUserShield],
    ['/admin/audit', 'Audit Logs', FaHistory],
  ],
};

// Department menu: the common items plus one item per record type the department owns.
function departmentMenu(role) {
  const items = [...MENUS.staff];
  const extra = recordTypesFor(role).map(([key, type]) => [`/staff/records/${key}`, type.menu, FaListAlt]);
  if (role === 'pensions') extra.unshift(['/staff/pension-register', 'Pension Register', FaUsers]);
  items.splice(3, 0, ...extra);
  return items;
}

export function menuKeyFor(user) {
  if (user.role === 'citizen' || user.role === 'admin' || user.role === 'homeaffairs') return user.role;
  return 'staff';
}

export default function Layout({ children }) {
  const { user, signOut, language, setLanguage, t, largeTextOn, setLargeTextOn, adaptations } = useApp();
  const data = useDb();
  const location = useLocation();
  const mainRef = useRef(null);

  // After each page change, move focus to the main area so screen-reader users
  // hear the new page instead of staying on the old menu item.
  useEffect(() => {
    mainRef.current?.focus();
  }, [location.pathname]);

  const unread = user.role === 'citizen'
    ? data.notifications.filter((n) => n.citizenId === user.citizenId && !n.read).length
    : 0;

  return (
    <>
      <a href="#main" className="skip">Skip to content</a>

      <header className="top">
        <Link to="/" className="brand">Gov Services Lesotho</Link>
        <div className="tools">
          <label className="sr" htmlFor="language">Language</label>
          <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="st">Sesotho (draft)</option>
          </select>
          <button className="btn ghost sm" aria-pressed={largeTextOn} onClick={() => setLargeTextOn(!largeTextOn)}>
            Text size
          </button>
          <span>{user.name}</span>
          <button className="btn ghost sm" onClick={signOut}>
            <FaSignOutAlt aria-hidden="true" /> {t('Log out')}
          </button>
        </div>
      </header>

      <div className="shell">
        <nav aria-label="Main" className="side">
          {(['citizen', 'admin', 'homeaffairs'].includes(user.role) ? MENUS[menuKeyFor(user)] : departmentMenu(user.role)).map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end>
              <Icon aria-hidden="true" /> {t(label)}
            </NavLink>
          ))}
        </nav>

        <main id="main" tabIndex="-1" ref={mainRef}>
          {/* Shown automatically for citizens whose profile includes hearing needs */}
          {adaptations.visualAlerts && unread > 0 && (
            <p className="alert-banner" role="status">
              <FaBell aria-hidden="true" /> You have {unread} new notification{unread > 1 ? 's' : ''}.{' '}
              <Link to="/notifications">Read now</Link>
            </p>
          )}
          {children}
        </main>
      </div>
    </>
  );
}
