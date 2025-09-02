import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faFish, faShoppingCart, faSignOutAlt, faBars, faSearch, faInfoCircle, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import { useAuth} from '../context/AuthContext';
import api from '../utils/api'; // Import api from new utility file
import { ThemeContext } from '../context/ThemeContext';
import * as Sentry from '@sentry/react';

// Styled Components
const AdminContainer = styled(motion.create('div'))`
  display: flex;
  min-height: 100vh;
  background: ${({ theme }) => theme.background || '#F1F5F9'};
  font-family: 'Roboto', sans-serif;
  overflow-x: hidden;
`;

const Sidebar = styled(motion.create('aside'))`
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

const SidebarLink = styled(motion.create(Link))`
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

const SidebarButton = styled(motion.create('div'))`
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

const MainContent = styled(motion.create('main'))`
  flex: 1;
  padding: clamp(1rem, 3vw, 2rem);
  background: ${({ theme }) => theme.background || '#F1F5F9'};
`;

const Header = styled(motion.create('header'))`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: clamp(0.75rem, 2vw, 1rem) clamp(1rem, 3vw, 2rem);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: clamp(1rem, 3vw, 2rem);
  border-radius: 8px;
`;

const MenuButton = styled(motion.create('button'))`
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

const Title = styled(motion.create('h1'))`
  font-size: clamp(1.2rem, 3vw, 1.5rem);
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  margin: 0;
`;

const UserInfo = styled(motion.create('div'))`
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 2vw, 1rem);
  font-size: clamp(0.8rem, 2vw, 1rem);
  color: ${({ theme }) => theme.text || '#1E3A8A'};
`;

const LogoutButton = styled(motion.create('button'))`
  background: none;
  border: none;
  color: ${({ theme }) => theme.primary || '#3B82F6'};
  cursor: pointer;
  font-size: clamp(0.8rem, 2vw, 1rem);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SearchBar = styled(motion.create('div'))`
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

const TableWrapper = styled(motion.create('div'))`
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

const AvatarWrapper = styled(motion.create('div'))`
  width: 40px;
  height: 40px;
  position: relative;
  overflow: hidden;
  border-radius: 50%;
`;

const Avatar = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
`;

const ActionButton = styled(motion.create('button'))`
  padding: 0.5rem 1rem;
  background: ${({ theme, isDelete }) => (isDelete ? '#EF4444' : theme.primary || '#3B82F6')};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 0.5rem;
  font-size: clamp(0.8rem, 2vw, 0.9rem);
  &:hover {
    background: ${({ theme, isDelete }) => (isDelete ? '#DC2626' : theme.primaryHover || '#2563EB')};
  }
  &:disabled {
    background: ${({ theme }) => theme.textSecondary || '#6B7280'};
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled(motion.create('p'))`
  color: #EF4444;
  font-size: clamp(0.8rem, 2vw, 0.875rem);
  text-align: center;
  margin-bottom: clamp(0.5rem, 2vw, 1rem);
`;

const ModalOverlay = styled(motion.create('div'))`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled(motion.create('div'))`
  background: white;
  padding: clamp(1.5rem, 3vw, 2rem);
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  text-align: center;
`;

const ModalButton = styled(motion.create('button'))`
  padding: 0.5rem 1rem;
  margin: 0 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: clamp(0.8rem, 2vw, 0.9rem);
  &:first-child {
    background: ${({ theme }) => theme.primary || '#3B82F6'};
    color: white;
  }
  &:last-child {
    background: #E5E7EB;
    color: #1F2937;
  }
`;

const Pagination = styled(motion.create('div'))`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: clamp(0.5rem, 2vw, 1rem);
`;

const PageButton = styled(motion.create('button'))`
  padding: 0.5rem 1rem;
  background: ${({ active, theme }) => (active ? theme.primary : '#E5E7EB')};
  color: ${({ active }) => (active ? 'white' : '#1F2937')};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: clamp(0.8rem, 2vw, 0.9rem);
  &:disabled {
    background: #D1D5DB;
    cursor: not-allowed;
  }
`;

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const modalVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};

const AdminUsers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading, error: authError, isOnline, logout } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, type: '', data: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'email', direction: 'asc' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const itemsPerPage = 5;

  if (authLoading) {
    return <div>{t('dashboard.loading')}</div>;
  }

  if (!user || !user.role || user.role !== 'admin') {
    navigate('/');
    return null;
  }

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError('');
      try {
        if (isOnline) {
          const response = await api.get('/users');
          setUsers(response.data);
          setFilteredUsers(response.data);
        } else {
          setError(t('dashboard.errors.offline'));
        }
      } catch (error) {
        Sentry.captureException(error);
        setError(error.response?.data?.message || t('dashboard.errors.generic'));
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user, isOnline, t]);

  useEffect(() => {
    const filtered = users.filter(
      (u) =>
        (u.email?.toLowerCase().includes(search.toLowerCase()) || '') ||
        (u.national_id?.toLowerCase().includes(search.toLowerCase()) || '') ||
        (u.name?.toLowerCase().includes(search.toLowerCase()) || '')
    );
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [search, users]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...filteredUsers].sort((a, b) => {
      const aValue = a[key] || '';
      const bValue = b[key] || '';
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredUsers(sortedData);
  };

  const handleDeleteUser = async (userId) => {
    try {
      if (isOnline) {
        await api.delete(`/users/${userId}`);
        setUsers(users.filter((u) => u.id !== userId));
        setFilteredUsers(filteredUsers.filter((u) => u.id !== userId));
        setModal({ open: false, type: '', data: null });
      } else {
        setError(t('dashboard.errors.offline'));
      }
    } catch (error) {
      Sentry.captureException(error);
      setError(error.response?.data?.message || t('dashboard.errors.generic'));
    }
  };

  const handleEditUser = (user) => {
    // Placeholder for edit modal; implement modal with form for updating user details
    setModal({ open: true, type: 'edit', data: user });
  };

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  return (
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
          <SidebarLink to="/profile" onClick={() => setIsSidebarOpen(false)}>
            <FontAwesomeIcon icon={faUsers} /> {t('Profile')}
          </SidebarLink>
          <SidebarButton
            onClick={() => {
              logout();
              navigate('/login');
              setIsSidebarOpen(false);
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
            <Title>{t('Manage Users')}</Title>
            <UserInfo>
              {user?.name || 'Unknown User'} ({user?.role || 'Unknown Role'})
              <LogoutButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => logout()}>
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
              {authError || error}
            </ErrorMessage>
          )}
          {loading && <p>{t('dashboard.loading')}</p>}
          <SearchBar>
            <FontAwesomeIcon icon={faSearch} />
            <SearchInput
              type="text"
              placeholder={t('Search users...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t('Search users')}
            />
          </SearchBar>
          <TableWrapper>
            <h3 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.25rem)' }}>{t('Users')}</h3>
            <Table>
              <thead>
                <tr>
                  <Th>{t('Avatar')}</Th>
                  <Th onClick={() => handleSort('id')}>
                    {t('dashboard.userId')} {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Th>
                  <Th onClick={() => handleSort('name')}>
                    {t('dashboard.name')} {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Th>
                  <Th onClick={() => handleSort('email')}>
                    {t('dashboard.email')} {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Th>
                  <Th onClick={() => handleSort('national_id')}>
                    {t('National ID')} {sortConfig.key === 'national_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Th>
                  <Th onClick={() => handleSort('role')}>
                    {t('dashboard.role')} {sortConfig.key === 'role' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </Th>
                  <Th>{t('dashboard.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u) => (
                  <tr key={u.id}>
                    <Td>
                      <AvatarWrapper>
                        <Avatar
                          src={u.avatar || '/assets/fallback-avatar.jpg'}
                          alt={t('profile.avatarAlt', { name: u.name || 'User' })}
                          onError={(e) => (e.target.src = '/assets/fallback-avatar.jpg')}
                        />
                      </AvatarWrapper>
                    </Td>
                    <Td>{u.id}</Td>
                    <Td>{u.name || 'N/A'}</Td>
                    <Td>{u.email}</Td>
                    <Td>{u.national_id || 'N/A'}</Td>
                    <Td>{u.role}</Td>
                    <Td>
                      <ActionButton
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEditUser(u)}
                        aria-label={t('Edit user')}
                      >
                        <FontAwesomeIcon icon={faEdit} /> {t('Edit')}
                      </ActionButton>
                      <ActionButton
                        isDelete
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setModal({ open: true, type: 'delete', data: u.id })}
                        aria-label={t('Delete user')}
                      >
                        <FontAwesomeIcon icon={faTrash} /> {t('Delete')}
                      </ActionButton>
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id={`user-${u.id}`}
                        style={{ marginLeft: '0.5rem', cursor: 'pointer' }}
                        aria-label={t('View user details')}
                      />
                      <Tooltip id={`user-${u.id}`} place="top" content={JSON.stringify(u, null, 2)} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PageButton
                  key={page}
                  active={currentPage === page}
                  onClick={() => setCurrentPage(page)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={t('Page {{page}}', { page })}
                >
                  {page}
                </PageButton>
              ))}
            </Pagination>
          </TableWrapper>
        </MainContent>
        {modal.open && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ModalContent
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <h3 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.25rem)' }}>
                {modal.type === 'delete'
                  ? t('dashboard.confirmDelete')
                  : t('dashboard.confirmEdit')}
              </h3>
              <div>
                <ModalButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => (modal.type === 'delete' ? handleDeleteUser(modal.data) : handleEditUser(modal.data))}
                  aria-label={t('Confirm')}
                >
                  {t('Confirm')}
                </ModalButton>
                <ModalButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setModal({ open: false, type: '', data: null })}
                  aria-label={t('Cancel')}
                >
                  {t('Cancel')}
                </ModalButton>
              </div>
            </ModalContent>
          </ModalOverlay>
        )}
      </AdminContainer>
    </motion.div>
  );
};

export default AdminUsers;