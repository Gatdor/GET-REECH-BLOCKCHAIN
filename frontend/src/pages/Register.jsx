import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { css } from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import * as Sentry from '@sentry/react';

const commonStyles = css`
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const clampFontSize = (min, vw, max) => `clamp(${min}rem, ${vw}vw, ${max}rem)`;

const GradientButton = css`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.primary || '#1E3A8A'} 0%,
    ${({ theme }) => theme.primaryHover || '#3B82F6'} 100%
  );
  color: white;
  border: none;
  padding: clamp(0.75rem, 1.5vw, 1rem) clamp(1.5rem, 2.5vw, 2rem);
  font-size: ${clampFontSize(0.9, 2, 1)};
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.primaryHover || '#2563EB'} 0%,
      #1E3A8A 100%
    );
  }
  &:disabled {
    background: ${({ theme }) => theme.textSecondary || '#6B7280'};
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const RegisterWrapper = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.background || '#F1F5F9'} 0%,
    ${({ theme }) => theme.backgroundSecondary || '#E2E8F0'} 100%
  );
  padding: clamp(1rem, 3vw, 2rem);
  @media (max-width: 768px) {
    padding: clamp(0.5rem, 2vw, 1rem);
  }
`;

const RegisterCard = styled(motion.div)`
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: clamp(1.5rem, 3vw, 2rem);
  ${commonStyles}
  max-width: 600px;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  @media (max-width: 768px) {
    padding: clamp(1rem, 2vw, 1.25rem);
    margin: 0 clamp(0.5rem, 2vw, 1rem);
    border-radius: 8px;
  }
`;

const Title = styled.h2`
  font-size: ${clampFontSize(1.5, 3, 2)};
  font-weight: 700;
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  margin-bottom: clamp(1rem, 2vw, 1.5rem);
  text-align: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: clamp(0.75rem, 2vw, 1rem);
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: ${clampFontSize(0.9, 2, 1)};
`;

const Input = styled.input`
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  border-radius: 8px;
  font-size: ${clampFontSize(0.9, 2, 1)};
  background: #fff;
  transition: border-color 0.3s, box-shadow 0.3s;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary || '#3B82F6'};
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
  }
  &:disabled {
    background: #f7fafc;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  border-radius: 8px;
  font-size: ${clampFontSize(0.9, 2, 1)};
  background: #fff;
  transition: border-color 0.3s, box-shadow 0.3s;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary || '#3B82F6'};
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
  }
  &:disabled {
    background: #f7fafc;
    cursor: not-allowed;
  }
`;

const Button = styled(motion.button)`
  ${GradientButton}
`;

const CancelButton = styled(motion.button)`
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  background: #fff;
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  border-radius: 8px;
  font-size: ${clampFontSize(0.9, 2, 1)};
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.backgroundSecondary || '#E2E8F0'};
  }
  &:disabled {
    background: #f7fafc;
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const Alert = styled(motion.p)`
  font-size: ${clampFontSize(0.8, 2, 0.875)};
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  border-radius: 8px;
  text-align: center;
  margin: 0;
`;

const SuccessMessage = styled(Alert)`
  background: #d1fae5;
  color: #065f46;
`;

const ErrorMessage = styled(Alert)`
  background: #fee2e2;
  color: #991b1b;
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

const REGISTER_TIMEOUT_MS = 30000;

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, user, isOnline, loading: authLoading, error: authError, setError } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    national_id: '',
    phone: '',
  });
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const timeout = useCallback(
    (promise, time) => {
      let timer;
      return Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(t('RegisterErrorsTimeout', 'Request timed out. Please try again.'))), time);
        }),
      ]).finally(() => clearTimeout(timer));
    },
    [t]
  );

  useEffect(() => {
    if (!authLoading && user) {
      console.log('[Register] User Phone:', user.phone);
      console.log('[Register] Redirecting user:', JSON.stringify(user, null, 2));
      const redirectPath = user.role === 'admin' ? '/dashboard' : user.role === 'buyer' ? '/market' : '/log-catch';
      navigate(redirectPath, { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setLocalError('');
    setSuccess('');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccess('');
    setError(null);

    if (!isOnline) {
      setLocalError(t('RegisterErrorsOffline', 'You are offline. Please connect to the internet.'));
      return;
    }
    if (!formData.name.trim()) {
      setLocalError(t('RegisterErrorsNameRequired', 'Name is required'));
      return;
    }
    if (!formData.email.trim()) {
      setLocalError(t('RegisterErrorsEmailRequired', 'Email is required'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setLocalError(t('RegisterErrorsInvalidEmail', 'Please enter a valid email address'));
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setLocalError(t('RegisterErrorsPasswordRequired', 'Password must be at least 6 characters'));
      return;
    }
    if (!formData.role) {
      setLocalError(t('RegisterErrorsRoleRequired', 'Please select a role'));
      return;
    }
    if (!formData.phone.trim()) {
      setLocalError(t('RegisterErrorsPhoneRequired', 'Phone number is required'));
      return;
    }
    if (!/^\+2547[0-9]{8}$/.test(formData.phone)) {
      setLocalError(t('RegisterErrorsInvalidPhone', 'Phone number must be in the format +2547XXXXXXXX'));
      return;
    }
    if (formData.national_id && formData.national_id.length < 8) {
      setLocalError(t('RegisterErrorsNationalIdRequired', 'National ID must be at least 8 digits'));
      return;
    }

    setLoading(true);

    try {
      console.log('[Register] Starting registration with email:', formData.email);
      console.time('Register');
      await timeout(
        register(formData.name, formData.email, formData.password, formData.role, formData.phone, formData.national_id),
        REGISTER_TIMEOUT_MS
      );
      console.timeEnd('Register');
      setSuccess(t('RegisterSuccessEmailConfirmation', 'Registration successful! Please check your email to confirm your account.'));
      // Navigation is handled by useEffect
    } catch (error) {
      console.error('[Register] Error:', error.message);
      Sentry.captureException(error);
      const errorMessage = error.response?.data?.message || t('RegisterErrorsGeneric', 'An error occurred. Please try again.');
      setLocalError(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', email: '', password: '', role: '', national_id: '', phone: '' });
    setLocalError('');
    setSuccess('');
    setError(null);
    setLoading(false);
    navigate('/');
  };

  return (
    <RegisterWrapper theme={theme} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <RegisterCard initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Title>{t('RegisterTitle', 'Register for GETREECH')}</Title>
        <AnimatePresence>
          {(localError || authError) && (
            <ErrorMessage
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="alert"
            >
              {localError || authError}
              {(localError === t('RegisterErrorsTimeout') || authError === t('RegisterErrorsTimeout')) && (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ marginTop: '0.5rem' }}
                >
                  {t('AppRetry', 'Retry')}
                </Button>
              )}
            </ErrorMessage>
          )}
          {success && (
            <SuccessMessage
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="alert"
            >
              {success}
            </SuccessMessage>
          )}
        </AnimatePresence>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="name">
              {t('RegisterName', 'Name')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="name-tip"
                data-tooltip-content={t('RegisterTooltipsName', 'Enter your full name as it appears on your ID')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
              />
            </Label>
            <Input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('RegisterPlaceholdersName', 'Enter your full name')}
              required
              aria-describedby="name-tip"
              disabled={loading || authLoading}
            />
            <Tooltip id="name-tip" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="email">
              {t('RegisterEmail', 'Email')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="email-tip"
                data-tooltip-content={t('RegisterTooltipsEmail', 'Enter the email for your account')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
              />
            </Label>
            <Input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('RegisterPlaceholdersEmail', 'Enter your email')}
              required
              aria-describedby="email-tip"
              disabled={loading || authLoading}
            />
            <Tooltip id="email-tip" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="password">
              {t('RegisterPassword', 'Password')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="password-tip"
                data-tooltip-content={t('RegisterTooltipsPassword', 'Password must be at least 6 characters')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
              />
            </Label>
            <Input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={t('RegisterPlaceholdersPassword', 'Enter your password')}
              required
              aria-describedby="password-tip"
              disabled={loading || authLoading}
            />
            <Tooltip id="password-tip" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="role">
              {t('RegisterRole', 'Role')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="role-tip"
                data-tooltip-content={t('RegisterTooltipsRole', 'Select your account role (Admin, Fisherman, or Buyer)')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
              />
            </Label>
            <Select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              disabled={loading || authLoading}
            >
              <option value="">{t('RegisterPlaceholdersRole', 'Select your role')}</option>
              <option value="admin">{t('RegisterRolesAdmin', 'Admin')}</option>
              <option value="fisherman">{t('RegisterRolesFisherman', 'Fisherman')}</option>
              <option value="buyer">{t('RegisterRolesBuyer', 'Buyer')}</option>
            </Select>
            <Tooltip id="role-tip" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="national_id">
              {t('RegisterNationalId', 'National ID')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="national-id-tip"
                data-tooltip-content={t('RegisterTooltipsNationalId', 'Enter your national ID number (optional)')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
              />
            </Label>
            <Input
              id="national_id"
              type="text"
              name="national_id"
              value={formData.national_id}
              onChange={handleChange}
              placeholder={t('RegisterPlaceholdersNationalId', 'Enter your national ID')}
              aria-describedby="national-id-tip"
              disabled={loading || authLoading}
            />
            <Tooltip id="national-id-tip" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="phone">
              {t('RegisterPhone', 'Phone Number')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="phone-tip"
                data-tooltip-content={t('RegisterTooltipsPhone', 'Enter your phone number for M-Pesa and communication')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
              />
            </Label>
            <Input
              id="phone"
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('RegisterPlaceholdersPhone', 'Enter your phone number')}
              required
              aria-describedby="phone-tip"
              disabled={loading || authLoading}
            />
            <Tooltip id="phone-tip" />
          </FormGroup>
          <div style={{ display: 'flex', gap: clampFontSize(0.5, 2, 0.75), justifyContent: 'center', flexWrap: 'wrap' }}>
            {loading ? (
              <LoadingSpinner theme={theme} />
            ) : (
              <>
                <Button
                  type="submit"
                  disabled={loading || authLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('RegisterButton', 'Register')}
                </Button>
                <CancelButton
                  type="button"
                  onClick={handleCancel}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={loading || authLoading}
                >
                  {t('RegisterCancel', 'Cancel')}
                </CancelButton>
              </>
            )}
          </div>
        </Form>
      </RegisterCard>
    </RegisterWrapper>
  );
};

export default Register;