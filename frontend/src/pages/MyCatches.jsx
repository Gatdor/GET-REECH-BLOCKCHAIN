import React, { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import * as Sentry from '@sentry/react';
import Sidebar from '../components/Sidebar'; // Reusable sidebar component

const commonStyles = css`
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const clampFontSize = (min, vw, max) => `clamp(${min}rem, ${vw}vw, ${max}rem)`;

const PageContainer = styled(motion.div)`
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, ${({ theme }) => theme.background || '#F1F5F9'} 0%, ${({ theme }) => theme.backgroundSecondary || '#E2E8F0'} 100%);
  font-family: 'Roboto', sans-serif;
`;

const MainContent = styled(motion.main)`
  flex: 1;
  padding: clamp(1rem, 3vw, 2rem);
`;

const Header = styled(motion.header)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: clamp(0.75rem, 2vw, 1rem) clamp(1rem, 3vw, 2rem);
  ${commonStyles}
  margin-bottom: clamp(1rem, 3vw, 2rem);
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
  font-size: ${clampFontSize(1.5, 3, 2)};
  font-weight: 700;
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  margin: 0;
`;

const TableWrapper = styled(motion.div)`
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: clamp(1rem, 2vw, 1.5rem);
  ${commonStyles}
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
  font-weight: 600;
  font-size: ${clampFontSize(0.9, 2, 1)};
`;

const Td = styled.td`
  padding: clamp(0.75rem, 2vw, 1rem);
  border-bottom: 1px solid ${({ theme }) => theme.textSecondary || '#E5E7EB'};
  font-size: ${clampFontSize(0.8, 2, 0.875)};
`;

const ErrorMessage = styled(motion.p)`
  background: #fee2e2;
  color: #991b1b;
  font-size: ${clampFontSize(0.8, 2, 0.875)};
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  border-radius: 8px;
  text-align: center;
  margin-bottom: clamp(0.5rem, 2vw, 1rem);
`;

const LoadingSpinner = styled(motion.div)`
  border: 4px solid ${({ theme }) => theme.textSecondary || '#D1D5DB'};
  border-top: 4px solid ${({ theme }) => theme.primary || '#3B82F6'};
  border-radius: 50%;
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
  margin: 1rem auto;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const MyCatches = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading, error: authError, isOnline, logout } = useAuth();
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'fisherman')) {
      const redirectPath = user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'buyer' ? '/market' : '/';
      navigate(redirectPath, { replace: true });
    }
  }, [user, authLoading, navigate]);

  const { data: catchLogsResponse, isLoading, error } = useQuery({
    queryKey: ['fishermanCatchLogs', user?.id],
    queryFn: async () => {
      const catches = await getCatches(user.id);
      return { data: catches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) };
    },
    enabled: !!user && !authLoading && user.role === 'fisherman' && isOnline,
    retry: (failureCount, error) => error.response?.status !== 401 && error.response?.status !== 403 && failureCount < 3,
    retryDelay: (attempt) => Math.min(attempt * 1000, 3000),
    onError: (err) => {
      console.error('[MyCatches] Fetch catch logs error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      Sentry.captureException(err);
    },
  });

  const catchLogs = catchLogsResponse?.data || [];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
      setIsSidebarOpen(false);
    } catch (err) {
      console.error('[MyCatches] Logout error:', err.message);
      Sentry.captureException(err);
    }
  };

  if (authLoading) {
    return <LoadingSpinner theme={theme} />;
  }

  return (
    <PageContainer theme={theme} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Sidebar
        role="fisherman"
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onLogout={handleLogout}
      />
      <MainContent>
        <Header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
          <MenuButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <FontAwesomeIcon icon={faBars} />
          </MenuButton>
          <Title>{t('app.myCatches', 'My Catches')}</Title>
        </Header>
        <AnimatePresence>
          {(authError || error || !isOnline) && (
            <ErrorMessage
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="alert"
            >
              {authError || error?.message || (!isOnline && t('app.offline', 'You are offline. Please connect to the internet.'))}
            </ErrorMessage>
          )}
        </AnimatePresence>
        {isLoading && <LoadingSpinner theme={theme} />}
        {!isLoading && catchLogs.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: clampFontSize(0.9, 2, 1), color: theme.textSecondary || '#6B7280' }}>
            {t('app.noData', 'No catch logs available. Start by logging your first catch!')}
          </p>
        )}
        {!isLoading && catchLogs.length > 0 && (
          <TableWrapper initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h3 style={{ fontSize: clampFontSize(1.1, 2.5, 1.3), color: theme.text || '#1E3A8A', marginBottom: '1rem' }}>
              {t('app.myCatches', 'My Catches')}
            </h3>
            <Table>
              <thead>
                <tr>
                  <Th>{t('app.id', 'ID')}</Th>
                  <Th>{t('app.species', 'Species')}</Th>
                  <Th>{t('app.batchSize', 'Batch Size')}</Th>
                  <Th>{t('app.weight', 'Weight')}</Th>
                  <Th>{t('app.status', 'Status')}</Th>
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
    </PageContainer>
  );
};

export default MyCatches;