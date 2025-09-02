import React, { useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faFish, faShoppingCart, faSignOutAlt, faBars } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import * as Sentry from '@sentry/react';

// Styled Components
const DashboardContainer = styled(motion.div)`
  display: flex;
  min-height: 100vh;
  background: ${({ theme }) => theme.background || '#F1F5F9'};
  font-family: 'Roboto', sans-serif;
`;

const Sidebar = styled(motion.aside)`
  width: 250px;
  background: ${({ theme }) => theme.primary || '#1E3A8A'};
  color: white;
  padding: clamp(1rem, 2vw, 1.5rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 0;
  height: 100vh;
  @media (max-width: 768px) {
    width: 100%;
    position: fixed;
    z-index: 1000;
    transform: ${({ isOpen }) => (isOpen ? 'translateX(0)' : 'translateX(-100%)')};
    transition: transform 0.3s ease;
  }
`;

const SidebarLink = styled(motion.a)`
  padding: 0.75rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
  text-decoration: none;
  cursor: pointer;
  font-size: clamp(0.9rem, 2vw, 1rem);
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const SidebarButton = styled(motion.div)`
  padding: 0.75rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
  text-decoration: none;
  cursor: pointer;
  font-size: clamp(0.9rem, 2vw, 1rem);
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const MainContent = styled(motion.main)`
  flex: 1;
  padding: clamp(1rem, 3vw, 2rem);
`;

const Header = styled(motion.header)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: clamp(0.75rem, 2vw, 1rem) clamp(1rem, 3vw, 2rem);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: clamp(1rem, 3vw, 2rem);
  border-radius: 8px;
`;

const MenuButton = styled(motion.button)`
  display: none;
  background: none;
  border: none;
  color: ${({ theme }) => theme.primary || '#3B82F6'};
  font-size: clamp(1.2rem, 3vw, 1.5rem);
  cursor: pointer;
  @media (max-width: 768px) {
    display: block;
  }
`;

const Title = styled(motion.h1)`
  font-size: clamp(1.2rem, 3vw, 1.5rem);
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  margin: 0;
`;

const UserInfo = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 2vw, 1rem);
  font-size: clamp(0.8rem, 2vw, 1rem);
  color: ${({ theme }) => theme.text || '#1E3A8A'};
`;

const LogoutButton = styled(motion.button)`
  background: none;
  border: none;
  color: ${({ theme }) => theme.primary || '#3B82F6'};
  cursor: pointer;
  font-size: clamp(0.8rem, 2vw, 1rem);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TableWrapper = styled(motion.div)`
  background: white;
  padding: clamp(1rem, 2vw, 1.5rem);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: clamp(1rem, 3vw, 2rem);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  padding: clamp(0.75rem, 2vw, 1rem);
  background: ${({ theme }) => theme.primary || '#1E3A8A'};
  color: white;
  text-align: left;
  font-weight: 500;
`;

const Td = styled.td`
  padding: clamp(0.75rem, 2vw, 1rem);
  border-bottom: 1px solid ${({ theme }) => theme.textSecondary || '#E5E7EB'};
`;

const ErrorMessage = styled(motion.p)`
  color: #EF4444;
  font-size: clamp(0.8rem, 2vw, 0.875rem);
  text-align: center;
  margin-bottom: clamp(0.5rem, 2vw, 1rem);
`;

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading, error: authError, isOnline, logout, getCatches } = useAuth();
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Handle navigation in useEffect to avoid React Router warning
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      console.log('[AdminDashboard] Redirecting to /: user:', user, 'authLoading:', authLoading);
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const { data: catchLogsResponse, isLoading, error } = useQuery({
    queryKey: ['catchLogs'],
    queryFn: async () => {
      const catches = await getCatches();
      return { data: catches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) };
    },
    enabled: !!user && !authLoading && user.role === 'admin',
    retry: (failureCount, error) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return false; // Don't retry on auth errors
      }
      return failureCount < 3; // Retry up to 3 times for other errors
    },
    retryDelay: (attempt) => Math.min(attempt * 1000, 3000), // Exponential backoff
    onError: (err) => {
      console.error('[AdminDashboard] Fetch catch logs error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      Sentry.captureException(err);
    },
  });

  const catchLogs = catchLogsResponse?.data || [];

  if (authLoading) {
    return <div>{t('dashboard.loading')}</div>;
  }

  return (
    <DashboardContainer theme={theme}>
      <Sidebar
        initial={{ x: -250 }}
        animate={{ x: isSidebarOpen ? 0 : -250 }}
        transition={{ duration: 0.3 }}
        isOpen={isSidebarOpen}
      >
        <motion.h2
          whileHover={{ scale: 1.05 }}
          style={{ marginBottom: '1rem', fontSize: 'clamp(1.2rem, 3vw, 1.5rem)' }}
        >
          {t('Admin Dashboard')}
        </motion.h2>
        <SidebarLink to="/dashboard" onClick={() => setIsSidebarOpen(false)}>
          <FontAwesomeIcon icon={faUsers} /> {t('Dashboard')}
        </SidebarLink>
        <SidebarLink to="/admin/users" onClick={() => setIsSidebarOpen(false)}>
          <FontAwesomeIcon icon={faUsers} /> {t('Manage Users')}
        </SidebarLink>
        <SidebarLink to="/admin/catch-logs" onClick={() => setIsSidebarOpen(false)}>
          <FontAwesomeIcon icon={faFish} /> {t('Catch Logs')}
        </SidebarLink>
        <SidebarLink to="/admin/market" onClick={() => setIsSidebarOpen(false)}>
          <FontAwesomeIcon icon={faShoppingCart} /> {t('Market')}
        </SidebarLink>
        <SidebarButton
          onClick={async () => {
            try {
              await logout();
              navigate('/login');
              setIsSidebarOpen(false);
            } catch (err) {
              console.error('[AdminDashboard] Logout error:', err);
            }
          }}
        >
          <FontAwesomeIcon icon={faSignOutAlt} /> {t('Logout')}
        </SidebarButton>
      </Sidebar>
      <MainContent>
        <Header>
          <MenuButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <FontAwesomeIcon icon={faBars} />
          </MenuButton>
          <Title>{t('Admin Dashboard')}</Title>
          <UserInfo>
            {user?.name || 'Unknown User'} ({user?.role || 'Unknown Role'})
            <LogoutButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                try {
                  await logout();
                  navigate('/login');
                } catch (err) {
                  console.error('[AdminDashboard] Logout error:', err);
                }
              }}
            >
              <FontAwesomeIcon icon={faSignOutAlt} /> {t('Logout')}
            </LogoutButton>
          </UserInfo>
        </Header>
        {(authError || error) && (
          <ErrorMessage
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            role="alert"
          >
            {authError || error?.message || t('dashboard.errors.generic')}
          </ErrorMessage>
        )}
        {isLoading && <p>{t('dashboard.loading')}</p>}
        {!isLoading && catchLogs.length === 0 && (
          <p>{t('dashboard.noData')}</p>
        )}
        {!isLoading && catchLogs.length > 0 && (
          <TableWrapper>
            <h3>{t('Recent Catch Logs')}</h3>
            <Table>
              <thead>
                <tr>
                  <Th>{t('ID')}</Th>
                  <Th>{t('Species')}</Th>
                  <Th>{t('Batch Size')}</Th>
                  <Th>{t('Weight')}</Th>
                  <Th>{t('Status')}</Th>
                </tr>
              </thead>
              <tbody>
                {catchLogs.map((log) => (
                  <tr key={log.id}>
                    <Td>{log.id}</Td>
                    <Td>{log.species || 'N/A'}</Td>
                    <Td>{log.batch_size || 'N/A'}</Td>
                    <Td>{log.weight || 'N/A'}</Td>
                    <Td>{log.status || 'N/A'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        )}
      </MainContent>
    </DashboardContainer>
  );
};

export default AdminDashboard;