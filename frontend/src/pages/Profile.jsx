import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faSignOutAlt, faUsers, faFish, faShoppingCart, faBars, faUser } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { get, set } from 'idb-keyval';
import * as Sentry from '@sentry/react';

// Styled Components (aligned with Dashboard.jsx and Market.jsx)
const AdminContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${({ theme }) => theme.background || '#F1F5F9'};
  font-family: 'Roboto', sans-serif;
  overflow-x: hidden;
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

const SidebarLink = styled(motion.div)`
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

const MainContent = styled.main`
  flex: 1;
  padding: clamp(1rem, 3vw, 2rem);
  background: ${({ theme }) => theme.background || '#F1F5F9'};
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
`;

const Header = styled.header`
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

const Title = styled.h1`
  font-size: clamp(1.2rem, 3vw, 1.5rem);
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  margin: 0;
`;

const UserInfo = styled.div`
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

const ProfileCard = styled(motion.div)`
  background: white;
  padding: clamp(1.5rem, 3vw, 2.5rem);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.textSecondary || '#E5E7EB'};
  @media (max-width: 768px) {
    padding: clamp(1rem, 2vw, 1.5rem);
  }
`;

const ProfileHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: clamp(1rem, 3vw, 2rem);
`;

const AvatarWrapper = styled.div`
  width: clamp(80px, 15vw, 100px);
  height: clamp(80px, 15vw, 100px);
  position: relative;
  overflow: hidden;
  border-radius: 50%;
  margin-bottom: 1rem;
  border: 2px solid ${({ theme }) => theme.primary || '#3B82F6'};
`;

const Avatar = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
`;

const WelcomeMessage = styled.p`
  font-size: clamp(0.9rem, 2vw, 1.1rem);
  color: ${({ theme }) => theme.textSecondary || '#6B7280'};
  text-align: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 2vw, 1.5rem);
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: ${({ theme }) => theme.text || '#1F2937'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: clamp(0.9rem, 2vw, 1rem);
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.textSecondary || '#D1D5DB'};
  border-radius: 8px;
  font-size: clamp(0.9rem, 2vw, 1rem);
  background: white;
  transition: border-color 0.3s, box-shadow 0.3s;
  width: 100%;
  box-sizing: border-box;
  &:focus {
    outline: 2px solid ${({ theme }) => theme.primary || '#3B82F6'};
    outline-offset: 2px;
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
  }
`;

const RoleDisplay = styled.p`
  color: ${({ theme }) => theme.text || '#1F2937'};
  font-size: clamp(0.9rem, 2vw, 1rem);
  font-weight: 500;
  background: ${({ theme }) => theme.background || '#F1F5F9'};
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
`;

const Button = styled(motion.button)`
  padding: 0.75rem;
  background: linear-gradient(90deg, ${({ theme }) => theme.primary || '#1E3A8A'} 0%, ${({ theme }) => theme.primaryHover || '#3B82F6'} 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: clamp(0.9rem, 2vw, 1rem);
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  max-width: 200px;
  margin: 0 auto;
  &:hover {
    background: linear-gradient(90deg, ${({ theme }) => theme.primaryHover || '#2563EB'} 0%, #1E3A8A 100%);
  }
  &:disabled {
    background: ${({ theme }) => theme.textSecondary || '#6B7280'};
    cursor: not-allowed;
    opacity: 0.6;
  }
  &:focus {
    outline: 2px solid ${({ theme }) => theme.primary || '#3B82F6'};
    outline-offset: 2px;
  }
`;

const Alert = styled(motion.p)`
  font-size: clamp(0.8rem, 2vw, 0.875rem);
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
  margin: 0 0 clamp(0.5rem, 2vw, 1rem);
`;

const SuccessMessage = styled(Alert)`
  background: #D1FAE5;
  color: #065F46;
`;

const ErrorMessage = styled(Alert)`
  background: #FEE2E2;
  color: #991B1B;
`;

// Animation Variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const validateForm = (formData, t) => {
  if (!formData.name.trim()) return t('profile.errors.nameRequired');
  if (!/^\d{8,}$/.test(formData.nationalId)) return t('profile.errors.invalidNationalId');
  if (!/^\+2547\d{8}$/.test(formData.phone)) return t('profile.errors.invalidPhone');
  return '';
};

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, supabase, isOnline, logout } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [formData, setFormData] = useState({
    name: '',
    nationalId: '',
    phone: '',
    role: 'fisherman',
    avatar: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('name, national_id, phone, role, avatar')
        .eq('id', user.id)
        .single();
      if (dbError) throw dbError;
      setFormData({
        name: data.name || '',
        nationalId: data.national_id || '',
        phone: data.phone || '',
        role: data.role || 'fisherman',
        avatar: data.avatar || '/assets/fallback-avatar.jpg',
      });
    } catch (error) {
      Sentry.captureException(error);
      setError(error.message || t('profile.errors.generic'));
    }
  }, [user, supabase, t]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (isOnline) fetchProfile();
    else {
      get('offlineProfileUpdates').then((updates) => {
        if (updates && updates.length > 0) {
          const latestUpdate = updates.find((update) => update.user_id === user.id);
          if (latestUpdate) {
            setFormData({
              name: latestUpdate.name || '',
              nationalId: latestUpdate.national_id || '',
              phone: latestUpdate.phone || '',
              role: formData.role,
              avatar: latestUpdate.avatar || '/assets/fallback-avatar.jpg',
            });
            setSuccess(t('profile.successOffline'));
          }
        }
      });
    }
  }, [user, isOnline, navigate, fetchProfile, t, formData.role]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const validationError = validateForm(formData, t);
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const data = {
        name: formData.name,
        national_id: formData.nationalId,
        phone: formData.phone,
        role: formData.role,
        avatar: formData.avatar,
      };

      if (isOnline) {
        const { error: dbError } = await supabase
          .from('profiles')
          .update(data)
          .eq('id', user.id);
        if (dbError) throw dbError;
        setSuccess(t('profile.success'));
      } else {
        await set('offlineProfileUpdates', [
          ...(await get('offlineProfileUpdates') || []),
          { user_id: user.id, ...data, timestamp: Date.now() },
        ]);
        setSuccess(t('profile.successOffline'));
      }
    } catch (error) {
      Sentry.captureException(error);
      setError(error.message || t('profile.errors.generic'));
    } finally {
      setLoading(false);
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
              <FontAwesomeIcon icon={faUser} /> {t('Profile')}
            </SidebarLink>
            <SidebarLink whileHover={{ scale: 1.05 }} onClick={() => { logout(); navigate('/login'); setIsSidebarOpen(false); }}>
              <FontAwesomeIcon icon={faSignOutAlt} /> {t('Logout')}
            </SidebarLink>
          </Sidebar>
          <MainContent>
            <Header>
              <MenuButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <FontAwesomeIcon icon={faBars} />
              </MenuButton>
              <Title>{t('profile.title')}</Title>
              <UserInfo>
                {user.user_metadata.name} ({user.user_metadata.role})
                <LogoutButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => logout()}>
                  <FontAwesomeIcon icon={faSignOutAlt} /> {t('Logout')}
                </LogoutButton>
              </UserInfo>
            </Header>
            <ProfileCard
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <ProfileHeader>
                <AvatarWrapper>
                  <Avatar
                    src={formData.avatar || '/assets/fallback-avatar.jpg'}
                    alt={t('profile.avatarAlt', { name: formData.name })}
                    onError={(e) => (e.target.src = '/assets/fallback-avatar.jpg')}
                  />
                </AvatarWrapper>
                <WelcomeMessage>
                  {t('profile.welcome', { role: t(`register.roles.${formData.role}`) })}
                </WelcomeMessage>
              </ProfileHeader>
              <AnimatePresence>
                {error && (
                  <ErrorMessage
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    role="alert"
                    aria-live="assertive"
                  >
                    {error}
                  </ErrorMessage>
                )}
                {success && (
                  <SuccessMessage
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    role="alert"
                    aria-live="polite"
                  >
                    {success}
                  </SuccessMessage>
                )}
              </AnimatePresence>
              <Form onSubmit={handleSubmit}>
                <FormGroup>
                  <Label htmlFor="name">
                    {t('profile.name')}
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      data-tooltip-id="name-tip"
                      data-tooltip-content={t('profile.tooltips.name')}
                      style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      aria-hidden="true"
                    />
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t('profile.placeholders.name')}
                    required
                    aria-describedby="name-tip"
                  />
                  <Tooltip id="name-tip" />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="nationalId">
                    {t('profile.nationalId')}
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      data-tooltip-id="nationalId-tip"
                      data-tooltip-content={t('profile.tooltips.nationalId')}
                      style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      aria-hidden="true"
                    />
                  </Label>
                  <Input
                    id="nationalId"
                    type="text"
                    name="nationalId"
                    value={formData.nationalId}
                    onChange={handleChange}
                    placeholder={t('profile.placeholders.nationalId')}
                    required
                    aria-describedby="nationalId-tip"
                  />
                  <Tooltip id="nationalId-tip" />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="phone">
                    {t('profile.phone')}
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      data-tooltip-id="phone-tip"
                      data-tooltip-content={t('profile.tooltips.phone')}
                      style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      aria-hidden="true"
                    />
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={t('profile.placeholders.phone')}
                    required
                    aria-describedby="phone-tip"
                  />
                  <Tooltip id="phone-tip" />
                </FormGroup>
                <FormGroup>
                  <Label>{t('profile.role')}</Label>
                  <RoleDisplay aria-live="polite">{t(`register.roles.${formData.role}`)}</RoleDisplay>
                </FormGroup>
                <Button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  aria-label={loading ? t('profile.submitting') : t('profile.submit')}
                >
                  {loading ? t('profile.submitting') : t('profile.submit')}
                </Button>
              </Form>
            </ProfileCard>
          </MainContent>
        </AdminContainer>
      </motion.div>
    </AnimatePresence>
  );
};

export default Profile;