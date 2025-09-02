import React, { useContext, useEffect, useState, forwardRef } from 'react';
import { Routes, Route, NavLink as RouterNavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import { ThemeContext } from './context/ThemeContext';
import * as Sentry from '@sentry/react';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Privacy from './pages/Privacy';
import CatchLog from './pages/CatchLog';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import FishermanDashboard from './components/Dashboard/FishermanDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminCatchLogs from './pages/AdminCatchLogs';
import Market from './pages/Market';
import MyCatches from './pages/MyCatches';
import Feedback from './pages/Feedback';
import ErrorBoundary from './components/ErrorBoundary';
import CatchDetails from './pages/CatchDetails';
import './App.css';

// Page transition animations
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const pageTransition = {
  duration: 0.4,
  ease: 'easeInOut',
};

// Styled components (unchanged)
const AppWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.background || '#f7fafc'} 0%,
    ${({ theme }) => theme.backgroundSecondary || '#e2e8f0'} 100%
  );
  color: ${({ theme }) => theme.text || '#2d3748'};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const Header = styled.header`
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: 1rem 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  border-bottom: 1px solid ${({ theme }) => theme.border || '#edf2f7'};
  @media screen and (max-width: 768px) {
    padding: 0.75rem 1rem;
  }
`;

const Nav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1280px;
  margin: 0 auto;
  flex-wrap: wrap;
  gap: 1rem;
  @media screen and (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }
`;

const MotionNavLink = motion.create(forwardRef((props, ref) => <RouterNavLink ref={ref} {...props} />));

const StyledNavLink = styled(MotionNavLink)`
  color: ${({ theme }) => theme.primary || '#2b6cb0'};
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  transition: background 0.3s, color 0.3s, transform 0.2s;
  &:hover {
    background: ${({ theme }) => theme.primaryHover || '#4299e1'};
    color: white;
    transform: translateY(-2px);
  }
  &.active {
    background: ${({ theme }) => theme.primary || '#2b6cb0'};
    color: white;
  }
  &:focus {
    outline: 2px solid ${({ theme }) => theme.primary || '#2b6cb0'};
    outline-offset: 2px;
  }
  @media screen and (max-width: 768px) {
    font-size: 0.95rem;
    padding: 0.5rem 1rem;
    width: 100%;
    text-align: center;
  }
  @media screen and (min-width: 1280px) {
    font-size: 1.2rem;
    padding: 0.75rem 2rem;
  }
`;

const LanguageSelect = styled(motion.select)`
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.primary || '#2b6cb0'};
  color: ${({ theme }) => theme.primary || '#2b6cb0'};
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s, color 0.3s;
  &:hover {
    background: ${({ theme }) => theme.primaryHover || '#4299e1'};
    color: white;
  }
  &:focus {
    outline: 2px solid ${({ theme }) => theme.primary || '#2b6cb0'};
    outline-offset: 2px;
  }
  @media screen and (max-width: 768px) {
    font-size: 0.9rem;
    padding: 0.4rem 0.8rem;
  }
`;

const Button = styled(motion.button)`
  padding: 0.75rem 1.75rem;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.primary || '#2b6cb0'} 0%,
    ${({ theme }) => theme.primaryLight || '#63b3ed'} 100%
  );
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s, transform 0.2s;
  &:hover {
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.primaryHover || '#2c5282'} 0%,
      ${({ theme }) => theme.primaryLightHover || '#4299e1'} 100%
    );
    transform: translateY(-2px);
  }
  &:disabled {
    background: ${({ theme }) => theme.disabled || '#a0aec0'};
    cursor: not-allowed;
    transform: none;
  }
  &:focus {
    outline: 2px solid ${({ theme }) => theme.primary || '#2b6cb0'};
    outline-offset: 2px;
  }
  @media screen and (max-width: 768px) {
    font-size: 0.95rem;
    padding: 0.5rem 1rem;
    width: 100%;
  }
  @media screen and (min-width: 1280px) {
    font-size: 1.2rem;
    padding: 0.75rem 2rem;
  }
`;

const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const DropdownButton = styled(motion.button)`
  color: ${({ theme }) => theme.primary || '#2b6cb0'};
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.3s, color 0.3s, transform 0.2s;
  &:hover {
    background: ${({ theme }) => theme.primaryHover || '#4299e1'};
    color: white;
    transform: translateY(-2px);
  }
  &:focus {
    outline: 2px solid ${({ theme }) => theme.primary || '#2b6cb0'};
    outline-offset: 2px;
  }
  @media screen and (max-width: 768px) {
    font-size: 0.95rem;
    padding: 0.5rem 1rem;
    width: 100%;
    text-align: center;
  }
`;

const MotionDropdownItem = motion.create(forwardRef((props, ref) => <RouterNavLink ref={ref} {...props} />));

const DropdownItem = styled(MotionDropdownItem)`
  display: block;
  color: ${({ theme }) => theme.primary || '#2b6cb0'};
  text-decoration: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  transition: background 0.3s, color 0.3s;
  &:hover {
    background: ${({ theme }) => theme.primaryHover || '#4299e1'};
    color: white;
  }
  &.active {
    background: ${({ theme }) => theme.primary || '#2b6cb0'};
    color: white;
  }
`;

const DropdownMenu = styled(motion.div)`
  position: absolute;
  top: 100%;
  left: 0;
  background: ${({ theme }) => theme.card || '#ffffff'};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 200px;
  overflow: hidden;
  @media screen and (max-width: 768px) {
    position: static;
    width: 100%;
  }
`;

const Main = styled(motion.main)`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  max-width: 1280px;
  margin: 1.5rem auto;
  width: 100%;
  background: ${({ theme }) => theme.card || '#ffffff'};
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  @media screen and (max-width: 768px) {
    padding: 1rem;
    margin: 1rem 0.5rem;
    border-radius: 8px;
  }
  @media screen and (min-width: 1280px) {
    padding: 3rem;
    margin: 2rem auto;
  }
`;

const LoadingOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
`;

const LoadingSpinner = styled(motion.div)`
  border: 4px solid ${({ theme }) => theme.primaryLight || '#63b3ed'};
  border-top: 4px solid ${({ theme }) => theme.primary || '#2b6cb0'};
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  @media screen and (max-width: 768px) {
    width: 32px;
    height: 32px;
    border-width: 3px;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: ${({ theme }) => theme.background || '#f7fafc'};
  color: ${({ theme }) => theme.text || '#2d3748'};
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
  gap: 1rem;
  padding: 1.5rem;
  @media screen and (max-width: 768px) {
    font-size: 1rem;
    gap: 0.75rem;
    padding: 1rem;
  }
  @media screen and (min-width: 1280px) {
    font-size: 1.5rem;
    gap: 1.5rem;
  }
`;

const App = () => {
  const { t, i18n } = useTranslation();
  const { user, loading, error, isOnline, logout, setError } = useAuth();
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [authLoading, setAuthLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Role-based navigation configuration
  const roleBasedNav = {
    admin: { path: '/admin/dashboard', label: 'Dashboard' },
    buyer: { path: '/market', label: 'Market' },
    fisherman: { path: '/fisherman-dashboard', label: 'Fisherman Dashboard' },
  };

  // Allowed paths for each role to prevent unwanted redirects
  const allowedPathsByRole = {
    admin: ['/admin/dashboard', '/admin/users', '/admin/catch-logs', '/profile', '/privacy', '/catch-details'],
    buyer: ['/market', '/profile', '/privacy', '/catch-details'],
    fisherman: ['/fisherman-dashboard', '/log-catch', '/my-catches', '/profile', '/privacy', '/catch-details'],
  };

  // Debug auth state
  useEffect(() => {
    console.log('[App] Auth State:', { user, loading, error, isOnline });
    console.log('[App] User Email:', user?.email || 'Not provided');
    console.log('[App] Current Path:', location.pathname);
  }, [user, loading, error, isOnline, location.pathname]);

  // Handle auth redirects
  useEffect(() => {
    if (loading || authLoading) {
      console.log('[App] Loading auth, skipping redirect');
      return;
    }
    if (user) {
      const redirectPath = roleBasedNav[user.role]?.path || '/';
      const allowedPaths = allowedPathsByRole[user.role] || ['/'];
      const isCatchDetailsPath = location.pathname.startsWith('/catch-details/');
      if (!allowedPaths.includes(location.pathname) && !isCatchDetailsPath) {
        console.log('[App] Redirecting to:', redirectPath, 'for role:', user.role);
        navigate(redirectPath, { replace: true });
      } else {
        console.log('[App] No redirect needed, on allowed path:', location.pathname);
      }
    } else if (location.pathname !== '/login' && location.pathname !== '/register' && location.pathname !== '/') {
      console.log('[App] Redirecting to /login: No user');
      navigate('/login', { replace: true });
    }
  }, [user, loading, authLoading, navigate, location.pathname]);

  const handleLogout = async () => {
    if (authLoading) return;
    try {
      setAuthLoading(true);
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('[App] Logout error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      Sentry.captureException(err);
      setError(err.response?.data?.message || 'Logout failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  // Show error for network or auth issues
  if (error || !isOnline) {
    return (
      <ErrorWrapper theme={theme}>
        <div>{error || t('app.offline', 'You are offline. Please connect to the internet.')}</div>
        <Button
          onClick={() => {
            setError(null);
            window.location.reload();
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={t('app.retry', 'Retry')}
        >
          {t('app.retry', 'Retry')}
        </Button>
      </ErrorWrapper>
    );
  }

  // Show loading overlay during initial auth check
  if (loading || authLoading) {
    return (
      <LoadingOverlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <LoadingSpinner theme={theme} />
      </LoadingOverlay>
    );
  }

  return (
    <AppWrapper theme={theme}>
      <Header theme={theme}>
        <Nav>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <StyledNavLink
              to="/"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label={t('app.home', 'Home')}
            >
              {t('app.home', 'Home')}
            </StyledNavLink>
            {user && (
              <>
                <StyledNavLink
                  to={roleBasedNav[user.role]?.path}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={t(roleBasedNav[user.role]?.label)}
                >
                  {t(roleBasedNav[user.role]?.label)}
                </StyledNavLink>
                {user.role === 'admin' && (
                  <DropdownContainer>
                    <DropdownButton
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      aria-label={t('app.adminTools', 'Admin Tools')}
                    >
                      {t('app.adminTools', 'Admin Tools')}
                    </DropdownButton>
                    {isDropdownOpen && (
                      <DropdownMenu
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <DropdownItem
                          to="/admin/users"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          aria-label={t('app.manageUsers', 'Manage Users')}
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          {t('app.manageUsers', 'Manage Users')}
                        </DropdownItem>
                        <DropdownItem
                          to="/admin/catch-logs"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          aria-label={t('app.catchLogs', 'Catch Logs')}
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          {t('app.catchLogs', 'Catch Logs')}
                        </DropdownItem>
                      </DropdownMenu>
                    )}
                  </DropdownContainer>
                )}
                <StyledNavLink
                  to="/profile"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={t('app.profile', 'Profile')}
                >
                  {t('app.profile', 'Profile')}
                </StyledNavLink>
                <StyledNavLink
                  to="/privacy"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={t('app.privacy', 'Privacy')}
                >
                  {t('app.privacy', 'Privacy')}
                </StyledNavLink>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <LanguageSelect
              onChange={(e) => changeLanguage(e.target.value)}
              value={i18n.language}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label={t('app.language', 'Language')}
            >
              <option value="en">EN</option>
              <option value="sw">SW</option>
            </LanguageSelect>
            {user ? (
              <Button
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={authLoading}
                aria-label={t('app.logout', 'Logout')}
              >
                {t('app.logout', 'Logout')}
              </Button>
            ) : (
              <>
                <StyledNavLink
                  to="/login"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={t('app.login', 'Login')}
                >
                  {t('app.login', 'Login')}
                </StyledNavLink>
                <StyledNavLink
                  to="/register"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={t('app.register', 'Register')}
                >
                  {t('app.register', 'Register')}
                </StyledNavLink>
              </>
            )}
          </div>
        </Nav>
      </Header>
      <Main
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
      >
        <ErrorBoundary
          fallback={
            <ErrorWrapper theme={theme}>
              <div>{t('app.error', 'An error occurred while loading this page.')}</div>
              <Button
                onClick={() => window.location.reload()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={t('app.retry', 'Retry')}
              >
                {t('app.retry', 'Retry')}
              </Button>
            </ErrorWrapper>
          }
        >
          <Routes>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="profile" element={<Profile />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="log-catch" element={<CatchLog />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="admin/dashboard" element={<AdminDashboard />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/catch-logs" element={<AdminCatchLogs />} />
            <Route path="market" element={<Market />} />
            <Route path="fisherman-dashboard" element={<FishermanDashboard />} />
            <Route path="my-catches" element={<MyCatches />} />
            <Route path="/catch-details/:id" element={<CatchDetails />} />
            <Route path="feedback" element={<Feedback />} />
          </Routes>
        </ErrorBoundary>
      </Main>
    </AppWrapper>
  );
};

export default App;