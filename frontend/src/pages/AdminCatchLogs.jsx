import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faFish, faShoppingCart, faSignOutAlt, faBars, faSearch, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import * as Sentry from '@sentry/react';

// Reuse styled components from AdminUsers.jsx
const TableWrapper = styled.div`
  background: white;
  padding: clamp(1rem, 2vw, 1.5rem);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: clamp(1rem, 3vw, 2rem);
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
`;

const Th = styled.th`
  padding: clamp(0.75rem, 2vw, 1rem);
  background: ${({ theme }) => theme.primary || '#1E3A8A'};
  color: white;
  text-align: left;
  font-weight: 500;
  font-size: clamp(0.9rem, 2vw, 1rem);
  cursor: pointer;
`;

const Td = styled.td`
  padding: clamp(0.75rem, 2vw, 1rem);
  border-bottom: 1px solid ${({ theme }) => theme.textSecondary || '#E5E7EB'};
  font-size: clamp(0.85rem, 2vw, 0.95rem);
`;

const ActionButton = styled(motion.button)`
  padding: 0.5rem 1rem;
  background: ${({ theme, reject }) => (reject ? '#EF4444' : theme.primary || '#3B82F6')};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 0.5rem;
  font-size: clamp(0.8rem, 2vw, 0.9rem);
  &:hover {
    background: ${({ theme, reject }) => (reject ? '#DC2626' : theme.primaryHover || '#2563EB')};
  }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: clamp(1rem, 3vw, 1.5rem);
  background: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 100%;
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  flex: 1;
  font-size: clamp(0.9rem, 2vw, 1rem);
`;

const ErrorMessage = styled(motion.p)`
  color: #EF4444;
  font-size: clamp(0.8rem, 2vw, 0.875rem);
  text-align: center;
  margin-bottom: clamp(0.5rem, 2vw, 1rem);
`;

const AdminCatchLogs = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, supabase, isOnline, logout } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [catches, setCatches] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.user_metadata.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchCatches = async () => {
      setLoading(true);
      try {
        if (isOnline) {
          const { data, error } = await supabase
            .from('catch_logs')
            .select('batch_id, species, weight, harvest_date, user_id, status');
          if (error) throw error;
          setCatches(data);
        } else {
          setError(t('dashboard.errors.offline'));
        }
      } catch (error) {
        Sentry.captureException(error);
        setError(t('dashboard.errors.generic'));
      } finally {
        setLoading(false);
      }
    };

    fetchCatches();
  }, [user, supabase, isOnline, navigate, t]);

  const filteredCatches = catches.filter(
    (c) =>
      c.batch_id.toLowerCase().includes(search.toLowerCase()) ||
      c.species.toLowerCase().includes(search.toLowerCase())
  );

  const handleApprove = async (batchId) => {
    try {
      if (isOnline) {
        const { error } = await supabase
          .from('catch_logs')
          .update({ status: 'approved' })
          .eq('batch_id', batchId);
        if (error) throw error;
        setCatches(catches.map((c) => (c.batch_id === batchId ? { ...c, status: 'approved' } : c)));
      } else {
        setError(t('dashboard.errors.offline'));
      }
    } catch (error) {
      Sentry.captureException(error);
      setError(t('dashboard.errors.generic'));
    }
  };

  const handleReject = async (batchId) => {
    try {
      if (isOnline) {
        const { error } = await supabase
          .from('catch_logs')
          .update({ status: 'rejected' })
          .eq('batch_id', batchId);
        if (error) throw error;
        setCatches(catches.map((c) => (c.batch_id === batchId ? { ...c, status: 'rejected' } : c)));
      } else {
        setError(t('dashboard.errors.offline'));
      }
    } catch (error) {
      Sentry.captureException(error);
      setError(t('dashboard.errors.generic'));
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.3 }}
      >
        <AdminContainer theme={theme}>
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
            <SidebarLink as={Link} to="/dashboard" whileHover={{ scale: 1.05 }} onClick={() => setIsSidebarOpen(false)}>
              <FontAwesomeIcon icon={faUsers} /> {t('Dashboard')}
            </SidebarLink>
            <SidebarLink as={Link} to="/admin/users" whileHover={{ scale: 1.05 }} onClick={() => setIsSidebarOpen(false)}>
              <FontAwesomeIcon icon={faUsers} /> {t('Manage Users')}
            </SidebarLink>
            <SidebarLink as={Link} to="/admin/catch-logs" whileHover={{ scale: 1.05 }} onClick={() => setIsSidebarOpen(false)}>
              <FontAwesomeIcon icon={faFish} /> {t('Catch Logs')}
            </SidebarLink>
            <SidebarLink as={Link} to="/admin/market" whileHover={{ scale: 1.05 }} onClick={() => setIsSidebarOpen(false)}>
              <FontAwesomeIcon icon={faShoppingCart} /> {t('Market')}
            </SidebarLink>
            <SidebarLink as={Link} to="/profile" whileHover={{ scale: 1.05 }} onClick={() => setIsSidebarOpen(false)}>
              <FontAwesomeIcon icon={faUsers} /> {t('Profile')}
            </SidebarLink>
            <SidebarLink
              whileHover={{ scale: 1.05 }}
              onClick={() => {
                logout();
                navigate('/login');
                setIsSidebarOpen(false);
              }}
            >
              <FontAwesomeIcon icon={faSignOutAlt} /> {t('Logout')}
            </SidebarLink>
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
              <Title>{t('Catch Logs')}</Title>
              <UserInfo>
                {user?.user_metadata?.name} ({user?.user_metadata?.role})
                <LogoutButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => logout()}>
                  <FontAwesomeIcon icon={faSignOutAlt} /> {t('Logout')}
                </LogoutButton>
              </UserInfo>
            </Header>
            {error && (
              <ErrorMessage
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                role="alert"
              >
                {error}
              </ErrorMessage>
            )}
            {loading && <p>{t('dashboard.loading')}</p>}
            <SearchBar>
              <FontAwesomeIcon icon={faSearch} />
              <SearchInput
                type="text"
                placeholder={t('Search catches...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t('Search catches')}
              />
            </SearchBar>
            <TableWrapper>
              <h3 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.25rem)' }}>{t('Catch Logs')}</h3>
              <Table>
                <thead>
                  <tr>
                    <Th>{t('catchLog.batchId')}</Th>
                    <Th>{t('catchLog.species')}</Th>
                    <Th>{t('catchLog.weight')}</Th>
                    <Th>{t('catchLog.harvestDate')}</Th>
                    <Th>{t('catchLog.userId')}</Th>
                    <Th>{t('catchLog.status')}</Th>
                    <Th>{t('dashboard.actions')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatches.map((c) => (
                    <tr key={c.batch_id}>
                      <Td>{c.batch_id}</Td>
                      <Td>{c.species}</Td>
                      <Td>{c.weight} kg</Td>
                      <Td>{new Date(c.harvest_date).toLocaleDateString()}</Td>
                      <Td>{c.user_id}</Td>
                      <Td>{c.status || 'Pending'}</Td>
                      <Td>
                        <ActionButton
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleApprove(c.batch_id)}
                          aria-label={t('Approve catch')}
                        >
                          <FontAwesomeIcon icon={faCheck} /> {t('Approve')}
                        </ActionButton>
                        <ActionButton
                          reject
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleReject(c.batch_id)}
                          aria-label={t('Reject catch')}
                        >
                          <FontAwesomeIcon icon={faTimes} /> {t('Reject')}
                        </ActionButton>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          </MainContent>
        </AdminContainer>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminCatchLogs;