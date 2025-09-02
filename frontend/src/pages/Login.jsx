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
  background: linear-gradient(90deg, ${({ theme }) => theme.primary || '#1E3A8A'} 0%, ${({ theme }) => theme.primaryHover || '#3B82F6'} 100%);
  color: white;
  border: none;
  padding: clamp(0.75rem, 1.5vw, 1rem) clamp(1.5rem, 2.5vw, 2rem);
  font-size: ${clampFontSize(0.9, 2, 1)};
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: linear-gradient(90deg, ${({ theme }) => theme.primaryHover || '#2563EB'} 0%, #1E3A8A 100%);
  }
  &:disabled {
    background: ${({ theme }) => theme.textSecondary || '#6B7280'};
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const LoginWrapper = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, ${({ theme }) => theme.background || '#F1F5F9'} 0%, ${({ theme }) => theme.backgroundSecondary || '#E2E8F0'} 100%);
  padding: clamp(1rem, 3vw, 2rem);
  @media (max-width: 768px) {
    padding: clamp(0.5rem, 2vw, 1rem);
  }
`;

const LoginCard = styled(motion.div)`
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

const LOGIN_TIMEOUT_MS = 30000;

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, login, isOnline, loading: authLoading, error: authError, setError } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [formData, setFormData] = useState({ email: '', password: '', role: '' });
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const timeout = useCallback(
    (promise, time) => {
      let timer;
      return Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(t('login.errors.timeout', 'Login request timed out. Please try again.'))), time);
        }),
      ]).finally(() => clearTimeout(timer));
    },
    [t]
  );

  useEffect(() => {
    if (!authLoading && user) {
      console.log('[Login] User:', JSON.stringify(user, null, 2));
      const redirectPath = user.role === 'admin' ? '/admin/dashboard' : user.role === 'buyer' ? '/market' : '/fisherman-dashboard';
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
      setLocalError(t('login.errors.offline', 'You are offline. Please connect to the internet.'));
      return;
    }
    if (!formData.email.trim()) {
      setLocalError(t('login.errors.emailRequired', 'Email is required.'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setLocalError(t('login.errors.invalidEmail', 'Please enter a valid email address.'));
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setLocalError(t('login.errors.passwordRequired', 'Password must be at least 6 characters.'));
      return;
    }
    if (!formData.role) {
      setLocalError(t('login.errors.roleRequired', 'Please select a role.'));
      return;
    }

    setLoading(true);

    try {
      console.log('[Login] Starting login with email:', formData.email);
      await timeout(login(formData.email, formData.password, formData.role), LOGIN_TIMEOUT_MS);
      setSuccess(t('login.success.login', { role: formData.role }));
      // Navigation is handled by useEffect
    } catch (error) {
      console.error('[Login] Error:', error.message);
      Sentry.captureException(error);
      const errorMessage = error.message || t('login.errors.generic', 'An error occurred during login.');
      setLocalError(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ email: '', password: '', role: '' });
    setLocalError('');
    setSuccess('');
    setError(null);
    setLoading(false);
    navigate('/');
  };

  return (
    <LoginWrapper theme={theme} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <LoginCard initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Title>{t('login.title', 'Login')}</Title>
        <AnimatePresence>
          {(localError || authError) && (
            <ErrorMessage initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} role="alert">
              {localError || authError}
              {(localError === t('login.errors.timeout') || authError === t('login.errors.timeout')) && (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ marginTop: '0.5rem' }}
                >
                  {t('login.retry', 'Retry')}
                </Button>
              )}
            </ErrorMessage>
          )}
          {success && (
            <SuccessMessage initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} role="alert">
              {success}
            </SuccessMessage>
          )}
        </AnimatePresence>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="email">
              {t('login.email', 'Email')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="email-tip"
                data-tooltip-content={t('login.tooltips.email', 'Enter your registered email address.')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
              />
            </Label>
            <Input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('login.placeholders.email', 'Enter your email')}
              required
              aria-describedby="email-tip"
              disabled={loading || authLoading}
            />
            <Tooltip id="email-tip" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="password">
              {t('login.password', 'Password')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="password-tip"
                data-tooltip-content={t('login.tooltips.password', 'Password must be at least 6 characters.')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
              />
            </Label>
            <Input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={t('login.placeholders.password', 'Enter your password')}
              required
              aria-describedby="password-tip"
              disabled={loading || authLoading}
            />
            <Tooltip id="password-tip" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="role">
              {t('login.role', 'Role')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="role-tip"
                data-tooltip-content={t('login.tooltips.role', 'Select your account type.')}
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
              <option value="">{t('login.placeholders.role', 'Select role')}</option>
              <option value="admin">{t('register.roles.admin', 'Admin')}</option>
              <option value="fisherman">{t('register.roles.fisherman', 'Fisherman')}</option>
              <option value="buyer">{t('register.roles.buyer', 'Buyer')}</option>
            </Select>
            <Tooltip id="role-tip" />
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
                  {t('login.button', 'Login')}
                </Button>
                <CancelButton
                  type="button"
                  onClick={handleCancel}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={loading || authLoading}
                >
                  {t('login.cancel', 'Cancel')}
                </CancelButton>
              </>
            )}
          </div>
        </Form>
      </LoginCard>
    </LoginWrapper>
  );
};

export default Login;