// frontend/src/pages/Feedback.jsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { get, set } from 'idb-keyval';
import * as Sentry from '@sentry/react';

const FeedbackWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background};
  padding: 1rem;
`;

const FeedbackCard = styled.div`
  background: ${({ theme }) => theme.colors.card};
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.textSecondary};
  border-radius: 4px;
  font-size: 1rem;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.3);
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.textSecondary};
  border-radius: 4px;
  font-size: 1rem;
  resize: vertical;
  min-height: 100px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.3);
  }
`;

const Button = styled.button`
  padding: 0.75rem;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
  }
  &:disabled {
    background: ${({ theme }) => theme.colors.textSecondary};
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: red;
  font-size: 0.875rem;
  margin: 0;
  text-align: center;
`;

const Feedback = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, supabase, isOnline } = useAuth();
  const { colors } = useContext(ThemeContext);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!user) return t('feedback.errors.unauthenticated');
    if (!formData.subject.trim()) return t('feedback.errors.subjectRequired');
    if (!formData.message.trim()) return t('feedback.errors.messageRequired');
    return '';
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const data = {
        user_id: user.id,
        subject: formData.subject,
        message: formData.message,
        created_at: new Date().toISOString(),
      };

      if (isOnline) {
        const { error: dbError } = await supabase.from('feedback').insert(data);
        if (dbError) throw dbError;
      } else {
        await set('offlineFeedback', [
          ...(await get('offlineFeedback') || []),
          { ...data, timestamp: Date.now() },
        ]);
      }

      alert(t('feedback.success'));
      setFormData({ subject: '', message: '' });
      navigate('/profile');
    } catch (error) {
      Sentry.captureException(error);
      setError(error.message || t('feedback.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeedbackWrapper theme={colors}>
      <FeedbackCard theme={colors}>
        <h2>{t('feedback.title')}</h2>
        {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="subject">
              {t('feedback.subject')}
              <FontAwesomeIcon icon={faInfoCircle} data-tooltip-id="subject-tip" data-tooltip-content={t('feedback.tooltips.subject')} />
            </Label>
            <Input
              id="subject"
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder={t('feedback.placeholders.subject')}
              required
              aria-describedby="subject-tip"
              theme={colors}
            />
            <Tooltip id="subject-tip" />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="message">
              {t('feedback.message')}
              <FontAwesomeIcon icon={faInfoCircle} data-tooltip-id="message-tip" data-tooltip-content={t('feedback.tooltips.message')} />
            </Label>
            <TextArea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder={t('feedback.placeholders.message')}
              required
              aria-describedby="message-tip"
              theme={colors}
            />
            <Tooltip id="message-tip" />
          </FormGroup>

          <Button type="submit" disabled={loading} theme={colors}>
            {loading ? t('feedback.submitting') : t('feedback.submit')}
          </Button>
        </Form>
      </FeedbackCard>
    </FeedbackWrapper>
  );
};

export default Feedback;