import React, { useState, useEffect, useContext } from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom'; // Added Link import
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faSignOutAlt, faUsers, faFish, faShoppingCart, faBars } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import * as Sentry from '@sentry/react';

// Styled Components
const AdminContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${({ theme }) => theme.background || '#F1F5F9'};
  font-family: 'Roboto', sans-serif;
`;

const Sidebar = styled(motion.aside)`
  width: 250px;
  background: ${({ theme }) => theme.primary || '#1E3A8A'};
  color: white;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  @media (max-width: 768px) {
    width: 100%;
    position: fixed;
    z-index: 1000;
    height: 100%;
    transform: ${({ isOpen }) => (isOpen ? 'translateX(0)' : 'translateX(-100%)')};
    transition: transform 0.3s ease;
  }
`;

const SidebarLink = styled(motion.div)`
  padding: 0.75rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
  text-decoration: none;
  cursor: pointer;
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem;
  background: ${({ theme }) => theme.background || '#F1F5F9'};
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  border-radius: 8px;
`;

const MenuButton = styled(motion.button)`
  display: none;
  background: none;
  border: none;
  color: ${({ theme }) => theme.primary || '#3B82F6'};
  font-size: 1.5rem;
  cursor: pointer;
  @media (max-width: 768px) {
    display: block;
  }
`;

const Title = styled.h1`
  font-size: 1.5rem;
  color: ${({ theme }) => theme.text || '#1E3A8A'};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.text || '#1E3A8A'};
`;

const LogoutButton = styled(motion.button)`
  background: none;
  border: none;
  color: ${({ theme }) => theme.primary || '#3B82F6'};
  cursor: pointer;
  font-size: 1rem;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const Card = styled(motion.div)`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const CardIcon = styled(FontAwesomeIcon)`
  font-size: 2rem;
  color: ${({ theme }) => theme.primary || '#3B82F6'};
`;

const CardTitle = styled.h3`
  font-size: 1.2rem;
  color: ${({ theme }) => theme.text || '#1E3A8A'};
`;

const CardValue = styled.p`
  font-size: 2rem;
  color: ${({ theme }) => theme.primary || '#3B82F6'};
`;

const TableWrapper = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  padding: 1rem;
  background: ${({ theme }) => theme.primary || '#1E3A8A'};
  color: white;
  text-align: left;
  font-weight: 500;
  cursor: pointer;
`;

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.textSecondary || '#E5E7EB'};
`;

const ActionButton = styled(motion.button)`
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.primary || '#3B82F6'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.primaryHover || '#2563EB'};
  }
  &:disabled {
    background: ${({ theme }) => theme.textSecondary || '#6B7280'};
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled(motion.p)`
  color: #EF4444;
  font-size: 0.875rem;
  text-align: center;
  margin-bottom: 1rem;
`;

const ModalOverlay = styled(motion.div)`
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

const ModalContent = styled(motion.div)`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  text-align: center;
`;

const ModalButton = styled(motion.button)`
  padding: 0.5rem 1rem;
  margin: 0 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:first-child {
    background: ${({ theme }) => theme.primary || '#3B82F6'};
    color: white;
  }
  &:last-child {
    background: #E5E7EB;
    color: #1F2937;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const PageButton = styled(motion.button)`
  padding: 0.5rem 1rem;
  background: ${({ active, theme }) => (active ? theme.primary : '#E5E7EB')};
  color: ${({ active }) => (active ? 'white' : '#1F2937')};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:disabled {
    background: #D1D5DB;
    cursor: not-allowed;
  }
`;

// Animation Variants
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

const validateListing = (listing) => {
  const errors = [];
  if (!listing?.species || typeof listing.species !== 'string' || listing.species.trim() === '') {
    errors.push('Invalid or missing species');
  }
  if (!listing?.weight || typeof listing.weight !== 'number' || listing.weight <= 0) {
    errors.push('Weight must be a positive number');
  }
  if (!listing?.price || typeof listing.price !== 'number' || listing.price <= 0) {
    errors.push('Price must be a positive number');
  }
  if (
    !listing?.quality_score ||
    typeof listing.quality_score !== 'number' ||
    listing.quality_score < 0 ||
    listing.quality_score > 1
  ) {
    errors.push('Quality score must be between 0 and 1');
  }
  if (!Array.isArray(listing?.image_urls)) {
    listing.image_urls = [];
  }
  if (errors.length > 0) {
    Sentry.captureMessage('Invalid catch_log data', { extra: { listing, errors } });
  }
  return errors.length > 0 ? errors : null;
};

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, supabase, isOnline, logout } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, type: '', data: null });
  const [currentPage, setCurrentPage] = useState({ listings: 1, users: 1 });
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const itemsPerPage = 5;

  useEffect(() => {
    if (!user || user.user_metadata.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError('');

      try {
        if (isOnline) {
          const { data: logsData, error: logsError } = await supabase
            .from('catch_logs')
            .select('*')
            .order('created_at', { ascending: false });
          if (logsError) throw logsError;

          const validListings = logsData.filter((listing) => !validateListing(listing));
          if (validListings.length < logsData.length) {
            setError(t('dashboard.errors.invalidData'));
          }
          setListings(validListings);

          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, email, role');
          if (usersError) throw usersError;
          setUsers(usersData);
        } else {
          setError(t('dashboard.errors.offline'));
        }
      } catch (error) {
        Sentry.captureException(error);
        setError(error.message || t('dashboard.errors.generic'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, supabase, isOnline, navigate, t]);

  const handleApproveListing = async (batchId) => {
    try {
      if (isOnline) {
        const { error } = await supabase
          .from('catch_logs')
          .update({ status: 'approved' })
          .eq('batch_id', batchId);
        if (error) throw error;
        setListings(listings.map((listing) =>
          listing.batch_id === batchId ? { ...listing, status: 'approved' } : listing
        ));
        setModal({ open: false, type: '', data: null });
      } else {
        setError(t('dashboard.errors.offline'));
      }
    } catch (error) {
      Sentry.captureException(error);
      setError(t('dashboard.errors.generic'));
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      if (isOnline) {
        const { error } = await supabase
          .from('users')
          .update({ role: newRole })
          .eq('id', userId);
        if (error) throw error;
        setUsers(users.map((u) =>
          u.id === userId ? { ...u, role: newRole } : u
        ));
        setModal({ open: false, type: '', data: null });
      } else {
        setError(t('dashboard.errors.offline'));
      }
    } catch (error) {
      Sentry.captureException(error);
      setError(t('dashboard.errors.generic'));
    }
  };

  const handleSort = (key, type) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...(type === 'listings' ? listings : users)].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    if (type === 'listings') {
      setListings(sortedData);
    } else {
      setUsers(sortedData);
    }
  };

  const paginatedListings = listings.slice(
    (currentPage.listings - 1) * itemsPerPage,
    currentPage.listings * itemsPerPage
  );

  const paginatedUsers = users.slice(
    (currentPage.users - 1) * itemsPerPage,
    currentPage.users * itemsPerPage
  );

  const totalPages = (data) => Math.ceil(data.length / itemsPerPage);

  if (!user || user.user_metadata.role !== 'admin') return null;

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
              style={{ marginBottom: '1rem' }}
            >
              {t('Admin Dashboard')}
            </motion.h2>
            <SidebarLink
              as={Link}
              to="/dashboard"
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsSidebarOpen(false)}
            >
              <FontAwesomeIcon icon={faUsers} /> {t('Dashboard')}
            </SidebarLink>
            <SidebarLink
              as={Link}
              to="/admin/users"
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsSidebarOpen(false)}
            >
              <FontAwesomeIcon icon={faUsers} /> {t('Manage Users')}
            </SidebarLink>
            <SidebarLink
              as={Link}
              to="/admin/catch-logs"
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsSidebarOpen(false)}
            >
              <FontAwesomeIcon icon={faFish} /> {t('Catch Logs')}
            </SidebarLink>
            <SidebarLink
              as={Link}
              to="/admin/market"
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsSidebarOpen(false)}
            >
              <FontAwesomeIcon icon={faShoppingCart} /> {t('Market')}
            </SidebarLink>
            <SidebarLink
              as={Link}
              to="/profile"
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsSidebarOpen(false)}
            >
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
              <Title>{t('Welcome, Admin')}</Title>
              <UserInfo>
                {user.user_metadata.name} ({user.user_metadata.role})
                <LogoutButton
                  whileHover={{ scale: 1.05 }}
                  onClick={() => logout()}
                >
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
            <CardGrid>
              <Card whileHover={{ scale: 1.05 }}>
                <CardIcon icon={faUsers} />
                <CardTitle>{t('Total Users')}</CardTitle>
                <CardValue>{users.length}</CardValue>
              </Card>
              <Card whileHover={{ scale: 1.05 }}>
                <CardIcon icon={faFish} />
                <CardTitle>{t('Catch Logs')}</CardTitle>
                <CardValue>{listings.length}</CardValue>
              </Card>
              <Card whileHover={{ scale: 1.05 }}>
                <CardIcon icon={faShoppingCart} />
                <CardTitle>{t('Pending Approvals')}</CardTitle>
                <CardValue>{listings.filter(l => l.status === 'pending').length}</CardValue>
              </Card>
            </CardGrid>
            <TableWrapper>
              <h3>{t('dashboard.catchLogs')}</h3>
              <Table>
                <thead>
                  <tr>
                    <Th onClick={() => handleSort('batch_id', 'listings')}>
                      {t('dashboard.batchId')} {sortConfig.key === 'batch_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th onClick={() => handleSort('species', 'listings')}>
                      {t('dashboard.species')} {sortConfig.key === 'species' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th onClick={() => handleSort('weight', 'listings')}>
                      {t('dashboard.weight')} {sortConfig.key === 'weight' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th onClick={() => handleSort('price', 'listings')}>
                      {t('dashboard.price')} {sortConfig.key === 'price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th>{t('dashboard.status')}</Th>
                    <Th>{t('dashboard.actions')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedListings.map((listing) => (
                    <tr key={listing.batch_id}>
                      <Td>{listing.batch_id}</Td>
                      <Td>{listing.species}</Td>
                      <Td>{listing.weight} kg</Td>
                      <Td>${listing.price}</Td>
                      <Td>{listing.status || 'pending'}</Td>
                      <Td>
                        {listing.status !== 'approved' && (
                          <ActionButton
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setModal({ open: true, type: 'approve', data: listing.batch_id })}
                            disabled={loading}
                          >
                            {t('dashboard.approve')}
                          </ActionButton>
                        )}
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          data-tooltip-id={`listing-${listing.batch_id}`}
                          style={{ marginLeft: '0.5rem', cursor: 'pointer' }}
                        />
                        <Tooltip id={`listing-${listing.batch_id}`} place="top" content={JSON.stringify(listing, null, 2)} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Pagination>
                {Array.from({ length: totalPages(listings) }, (_, i) => i + 1).map((page) => (
                  <PageButton
                    key={page}
                    active={currentPage.listings === page}
                    onClick={() => setCurrentPage({ ...currentPage, listings: page })}
                    whileHover={{ scale: 1.05 }}
                  >
                    {page}
                  </PageButton>
                ))}
              </Pagination>
            </TableWrapper>
            <TableWrapper>
              <h3>{t('dashboard.users')}</h3>
              <Table>
                <thead>
                  <tr>
                    <Th onClick={() => handleSort('id', 'users')}>
                      {t('dashboard.userId')} {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th onClick={() => handleSort('email', 'users')}>
                      {t('dashboard.email')} {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th onClick={() => handleSort('role', 'users')}>
                      {t('dashboard.role')} {sortConfig.key === 'role' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th>{t('dashboard.actions')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u) => (
                    <tr key={u.id}>
                      <Td>{u.id}</Td>
                      <Td>{u.email}</Td>
                      <Td>{u.role}</Td>
                      <Td>
                        <ActionButton
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setModal({ open: true, type: 'role', data: { id: u.id, role: u.role === 'admin' ? 'user' : 'admin' } })}
                          disabled={loading}
                        >
                          {t('dashboard.toggleRole')}
                        </ActionButton>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Pagination>
                {Array.from({ length: totalPages(users) }, (_, i) => i + 1).map((page) => (
                  <PageButton
                    key={page}
                    active={currentPage.users === page}
                    onClick={() => setCurrentPage({ ...currentPage, users: page })}
                    whileHover={{ scale: 1.05 }}
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
                <h3>
                  {modal.type === 'approve'
                    ? t('dashboard.confirmApprove')
                    : t('dashboard.confirmRoleChange', { role: modal.data.role })}
                </h3>
                <div>
                  <ModalButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      modal.type === 'approve'
                        ? handleApproveListing(modal.data)
                        : handleUpdateUserRole(modal.data.id, modal.data.role)
                    }
                  >
                    {t('Confirm')}
                  </ModalButton>
                  <ModalButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setModal({ open: false, type: '', data: null })}
                  >
                    {t('Cancel')}
                  </ModalButton>
                </div>
              </ModalContent>
            </ModalOverlay>
          )}
        </AdminContainer>
      </motion.div>
    </AnimatePresence>
  );
};

export default Dashboard;