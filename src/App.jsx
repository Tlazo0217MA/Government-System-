import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppContext, SESOTHO, useApp } from './context/AppContext.jsx';
import { getUser, getNeedsForUser } from './services/authService.js';
import { useDb } from './services/storage.js';
import { getAdaptations } from './utils/accessibilityNeeds.js';
import Layout from './components/Layout.jsx';
import { VoiceProvider } from './voice/VoiceProvider.jsx';

import LoginPage from './pages/LoginPage.jsx';
import CitizenDashboard from './pages/CitizenDashboard.jsx';
import CitizenProfilePage from './pages/CitizenProfilePage.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import ApplyPage from './pages/ApplyPage.jsx';
import MyApplicationsPage from './pages/MyApplicationsPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import HelpPage from './pages/HelpPage.jsx';
import ApplicationDetailPage from './pages/ApplicationDetailPage.jsx';
import StaffDashboard from './pages/StaffDashboard.jsx';
import StaffApplicationsPage from './pages/StaffApplicationsPage.jsx';
import CitizenSearchPage from './pages/CitizenSearchPage.jsx';
import StaffCitizenProfilePage from './pages/StaffCitizenProfilePage.jsx';
import AddCitizenPage from './pages/AddCitizenPage.jsx';
import AuditLogPage from './pages/AuditLogPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import OfficersPage from './pages/OfficersPage.jsx';
import RolesPage from './pages/RolesPage.jsx';
import AccessRequestsPage from './pages/AccessRequestsPage.jsx';
import CivilHubPage from './pages/CivilHubPage.jsx';
import BirthPage from './pages/BirthPage.jsx';
import NationalIdPage from './pages/NationalIdPage.jsx';
import MarriagePage from './pages/MarriagePage.jsx';
import DeathPage from './pages/DeathPage.jsx';
import CivilRecordsPage from './pages/CivilRecordsPage.jsx';
import RecordsPage from './pages/RecordsPage.jsx';
import RecordNewPage from './pages/RecordNewPage.jsx';
import RecordDetailPage from './pages/RecordDetailPage.jsx';
import PensionRegisterPage from './pages/PensionRegisterPage.jsx';
import StaffNewApplicationPage from './pages/StaffNewApplicationPage.jsx';

// Which area each kind of user belongs to. Home Affairs and department officers share "staff".
function areaFor(user) {
  if (user.role === 'citizen') return 'citizen';
  if (user.role === 'admin') return 'admin';
  return 'staff';
}

const HOME_PATH = { citizen: '/citizen', admin: '/admin', staff: '/staff' };

// Wraps a page: must be logged in, and must belong to the right area, otherwise redirect.
// Defined outside App so React keeps pages mounted when saved data changes.
function Protected({ area, only, notRole, children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  if (areaFor(user) !== area) return <Navigate to={HOME_PATH[areaFor(user)]} replace />;
  if ((only && user.role !== only) || (notRole && user.role === notRole)) return <Navigate to={HOME_PATH[area]} replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  useDb(); // re-render when saved data changes (for example when needs are edited)
  const [userId, setUserId] = useState(sessionStorage.getItem('userId'));
  const [language, setLanguage] = useState('en');
  const [largeTextOn, setLargeTextOn] = useState(false);

  const user = userId ? getUser(userId) : null;

  // The system adapts itself to the needs Home Affairs recorded at registration.
  // Citizens AND officers can have needs, so every kind of user is adapted.
  const adaptations = getAdaptations(getNeedsForUser(user));

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language === 'st' ? 'st' : 'en';
    root.classList.toggle('large-text', largeTextOn || adaptations.largeText);
    root.classList.toggle('high-contrast', adaptations.highContrast);
    root.classList.toggle('large-targets', adaptations.largeTargets);
  }, [language, largeTextOn, adaptations.largeText, adaptations.highContrast, adaptations.largeTargets]);

  const context = {
    user,
    language,
    setLanguage,
    largeTextOn,
    setLargeTextOn,
    adaptations,
    t: (text) => (language === 'st' && SESOTHO[text]) || text,
    signIn: (loggedInUser) => {
      sessionStorage.setItem('userId', loggedInUser.id);
      setUserId(loggedInUser.id);
    },
    signOut: () => {
      sessionStorage.removeItem('userId');
      setUserId(null);
    },
  };

  const homeRedirect = user ? HOME_PATH[areaFor(user)] : '/login';

  return (
    <AppContext.Provider value={context}>
      <VoiceProvider>
      <Routes>
        <Route path="/" element={<Navigate to={homeRedirect} replace />} />
        <Route path="/login" element={user ? <Navigate to={homeRedirect} replace /> : <LoginPage />} />

        {/* Citizen area */}
        <Route path="/citizen" element={<Protected area="citizen"><CitizenDashboard /></Protected>} />
        <Route path="/citizen/profile" element={<Protected area="citizen"><CitizenProfilePage /></Protected>} />
        <Route path="/services" element={<Protected area="citizen"><ServicesPage /></Protected>} />
        <Route path="/apply/:serviceKey" element={<Protected area="citizen"><ApplyPage /></Protected>} />
        <Route path="/applications" element={<Protected area="citizen"><MyApplicationsPage /></Protected>} />
        <Route path="/applications/:ref" element={<Protected area="citizen"><ApplicationDetailPage /></Protected>} />
        <Route path="/notifications" element={<Protected area="citizen"><NotificationsPage /></Protected>} />
        <Route path="/help" element={<Protected area="citizen"><HelpPage /></Protected>} />

        {/* Staff area (Home Affairs and department officers) */}
        <Route path="/staff" element={<Protected area="staff"><StaffDashboard /></Protected>} />
        <Route path="/staff/citizens" element={<Protected area="staff"><CitizenSearchPage /></Protected>} />
        <Route
          path="/staff/citizens/new"
          element={
            <Protected area="staff">
              {user?.role === 'homeaffairs' ? <AddCitizenPage /> : <Navigate to="/staff" replace />}
            </Protected>
          }
        />
        <Route path="/staff/citizens/:citizenId" element={<Protected area="staff"><StaffCitizenProfilePage /></Protected>} />
        <Route path="/staff/applications" element={<Protected area="staff"><StaffApplicationsPage /></Protected>} />
        <Route path="/staff/applications/:ref" element={<Protected area="staff"><ApplicationDetailPage staff /></Protected>} />
        <Route path="/staff/requests" element={<Protected area="staff">{user?.role === 'homeaffairs' ? <AccessRequestsPage /> : <Navigate to="/staff" replace />}</Protected>} />
        <Route path="/staff/audit" element={<Protected area="staff"><AuditLogPage /></Protected>} />

        {/* Home Affairs civil registration */}
        <Route path="/staff/civil" element={<Protected area="staff" only="homeaffairs"><CivilHubPage /></Protected>} />
        <Route path="/staff/civil/birth" element={<Protected area="staff" only="homeaffairs"><BirthPage /></Protected>} />
        <Route path="/staff/civil/id" element={<Protected area="staff" only="homeaffairs"><NationalIdPage /></Protected>} />
        <Route path="/staff/civil/marriage" element={<Protected area="staff" only="homeaffairs"><MarriagePage /></Protected>} />
        <Route path="/staff/civil/death" element={<Protected area="staff" only="homeaffairs"><DeathPage /></Protected>} />
        <Route path="/staff/civil/records" element={<Protected area="staff" only="homeaffairs"><CivilRecordsPage /></Protected>} />

        {/* Department records (generic pages built from config/recordTypes.js) */}
        <Route path="/staff/records/:typeKey" element={<Protected area="staff"><RecordsPage /></Protected>} />
        <Route path="/staff/records/:typeKey/new" element={<Protected area="staff"><RecordNewPage /></Protected>} />
        <Route path="/staff/records/:typeKey/:ref" element={<Protected area="staff"><RecordDetailPage /></Protected>} />
        <Route path="/staff/pension-register" element={<Protected area="staff" only="pensions"><PensionRegisterPage /></Protected>} />
        <Route path="/staff/applications/new" element={<Protected area="staff" notRole="homeaffairs"><StaffNewApplicationPage /></Protected>} />

        {/* Administrator area */}
        <Route path="/admin" element={<Protected area="admin"><AdminDashboard /></Protected>} />
        <Route path="/admin/officers" element={<Protected area="admin"><OfficersPage /></Protected>} />
        <Route path="/admin/roles" element={<Protected area="admin"><RolesPage /></Protected>} />
        <Route path="/admin/audit" element={<Protected area="admin"><AuditLogPage /></Protected>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </VoiceProvider>
    </AppContext.Provider>
  );
}
