// src/components/CatchEntry/LogCatchBatchForm.jsx
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { StyleSheetManager } from 'styled-components';
import isPropValid from '@emotion/is-prop-valid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCamera,
  faTrash,
  faPlus,
  faSave,
  faTimes,
  faMapMarkerAlt,
  faExclamationTriangle,
  faCheckCircle,
  faSpinner,
  faPrint,
  faSignOutAlt,
} from '@fortawesome/free-solid-svg-icons';
import { get, set } from 'idb-keyval';
import QRCode from 'react-qr-code';
import { useReactToPrint } from 'react-to-print';
import * as Sentry from '@sentry/react';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';

const clamp = (min, val, max) => `clamp(${min}rem, ${val}vw, ${max}rem)`;

// Styled Components
const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, ${({ theme }) => theme.background || '#f1f5f9'} 0%, ${({ theme }) => theme.backgroundSecondary || '#e2e8f0'} 100%);
  padding: ${clamp(1, 3, 2)};
  display: flex;
  justify-content: center;
  align-items: flex-start;
`;

const FormCard = styled(motion.div)`
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: ${clamp(1.5, 3, 2.5)};
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid ${({ theme }) => theme.border || '#d1d5db'};
  max-width: 900px;
  width: 100%;
  margin: 1rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.border || '#e5e7eb'};
`;

const PageTitle = styled.h1`
  font-size: ${clamp(1.5, 3, 2)};
  font-weight: 700;
  color: ${({ theme }) => theme.text || '#1e3a8a'};
  margin: 0;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: ${clamp(0.8, 2, 1)};
  color: ${({ theme }) => theme.text || '#1e3a8a'};
`;

const LogoutButton = styled(motion.button)`
  background: none;
  border: none;
  color: ${({ theme }) => theme.primary || '#3b82f6'};
  cursor: pointer;
  font-size: ${clamp(0.8, 2, 1)};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const CatchSection = styled(motion.div)`
  background: ${({ theme }) => theme.background || '#f9fafb'};
  padding: 1.25rem;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.border || '#e5e7eb'};
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text || '#1f2937'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InputGroup = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  font-size: ${clamp(0.9, 2, 0.95)};
  color: ${({ theme }) => theme.text || '#1f2937'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 1px solid ${({ theme }) => theme.border || '#d1d5db'};
  border-radius: 8px;
  font-size: ${clamp(0.9, 2, 1)};
  transition: all 0.3s;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary || '#3b82f6'};
    box-shadow: 0 0 0 3px ${({ theme }) => (theme.primary || '#3b82f6') + '33'};
  }
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  border: 1px solid ${({ theme }) => theme.border || '#d1d5db'};
  border-radius: 8px;
  font-size: ${clamp(0.9, 2, 1)};
`;

const TextArea = styled.textarea`
  padding: 0.75rem 1rem;
  border: 1px solid ${({ theme }) => theme.border || '#d1d5db'};
  border-radius: 8px;
  font-size: ${clamp(0.9, 2, 1)};
  min-height: 100px;
  resize: vertical;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary || '#3b82f6'};
    box-shadow: 0 0 0 3px ${({ theme }) => (theme.primary || '#3b82f6') + '33'};
  }
`;

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 0.5rem;
`;

const ImagePreview = styled.div`
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

const PreviewImg = styled.img`
  width: 100%;
  height: 100px;
  object-fit: cover;
`;

const RemoveImage = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 0.75rem;
  cursor: pointer;
`;

const CameraButton = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem;
  border: 2px dashed ${({ theme }) => theme.border || '#d1d5db'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    border-color: ${({ theme }) => theme.primary || '#3b82f6'};
    background: ${({ theme }) => (theme.primary || '#3b82f6') + '0a'};
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const ProgressBar = styled.div`
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin: 1.5rem 0;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: ${({ theme }) => theme.primary || '#3b82f6'};
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const SubmitButton = styled(motion.button)`
  background: ${({ theme, danger }) => (danger ? '#ef4444' : theme.primary || '#3b82f6')};
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 160px;
  justify-content: center;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Toast = styled(motion.div)`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: ${({ type }) => (type === 'success' ? '#10b981' : '#ef4444')};
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  z-index: 1000;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 90vw;
`;

const PrintArea = styled.div`
  display: none;
  @media print {
    display: block;
    page-break-after: always;
    text-align: center;
    margin: 2rem 0;
  }
`;

const pageVariants = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -50 },
};

const LogCatchBatchForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isOnline, api, logout } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const queryClient = useQueryClient();
  const printRef = useRef();

  const [catches, setCatches] = useState([
    {
      species: '',
      weight: '',
      harvest_date: new Date().toISOString().split('T')[0],
      location: '',
      notes: '',
      images: [],
      lat: null,
      lng: null,
    },
  ]);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Batch_Catch_QR_${new Date().toISOString().split('T')[0]}`,
  });

  // GPS
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      showToast('error', t('gps_unavailable', 'GPS not available'));
      return;
    }

    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCatches(prev => prev.map((c, i) => i === 0 ? {
          ...c,
          lat: latitude,
          lng: longitude,
          location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        } : c));
        setLocationStatus('success');
        showToast('success', t('gps_success', 'Location captured'));
      },
      (err) => {
        setLocationStatus('error');
        showToast('error', t('gps_failed', 'Failed to get location'));
        Sentry.captureException(err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [showToast, t]);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  // Image Handling
  const handleImageChange = (index, files) => {
    const newImages = Array.from(files).slice(0, 5);
    setCatches(prev => prev.map((c, i) =>
      i === index ? { ...c, images: [...c.images, ...newImages] } : c
    ));
  };

  const removeImage = (catchIndex, imgIndex) => {
    setCatches(prev => prev.map((c, i) =>
      i === catchIndex ? { ...c, images: c.images.filter((_, j) => j !== imgIndex) } : c
    ));
  };

  // Add/Remove Catch
  const addCatch = () => {
    setCatches(prev => [...prev, {
      species: '',
      weight: '',
      harvest_date: new Date().toISOString().split('T')[0],
      location: catches[0]?.location || '',
      notes: '',
      images: [],
      lat: catches[0]?.lat || null,
      lng: catches[0]?.lng || null,
    }]);
  };

  const removeCatch = (index) => {
    if (catches.length === 1) return;
    setCatches(prev => prev.filter((_, i) => i !== index));
  };

  // Validation
  const validate = () => {
    for (const c of catches) {
      if (!c.species || !c.weight || parseFloat(c.weight) <= 0) {
        showToast('error', t('validation_required', 'Species and valid weight required'));
        return false;
      }
    }
    return true;
  };

  // Submit to /batches
  const mutation = useMutation({
    mutationFn: async (batchData) => {
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('batch', JSON.stringify(batchData.map(({ images, ...c }) => ({
        ...c,
        location: c.lat && c.lng ? `POINT(${c.lng} ${c.lat})` : null,
      }))));

      let imageIndex = 0;
      for (const c of batchData) {
        c.images.forEach(img => {
          formData.append(`image_${imageIndex}`, img);
          imageIndex++;
        });
      }

      const response = await api.post('/batches', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['catches'] });
      showToast('success', t('batch_success', 'Batch logged on blockchain!'));
      setTimeout(() => navigate('/fisherman-dashboard'), 1500);
    },
    onError: (err) => {
      showToast('error', err.response?.data?.message || err.message || t('submit_failed'));
      Sentry.captureException(err);
    },
  });

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!isOnline) {
      const offlineActions = (await get('offlineActions')) || [];
      const batchId = `offline-batch-${Date.now()}`;
      offlineActions.push({
        type: 'batch_create',
        id: batchId,
        data: catches.map((c, i) => ({
          ...c,
          catch_id: `${batchId}-${i}`,
          status: 'pending',
          user_id: user.id,
          location: c.lat && c.lng ? `POINT(${c.lng} ${c.lat})` : null,
        })),
      });
      await set('offlineActions', offlineActions);
      showToast('success', t('saved_offline', 'Saved offline. Will sync when online.'));
      setTimeout(() => navigate('/fisherman-dashboard'), 1500);
      return;
    }

    setIsSubmitting(true);
    mutation.mutate(catches);
    setIsSubmitting(false);
  };

  if (!user || user.role !== 'fisherman') {
    navigate('/login');
    return null;
  }

  return (
    <Sentry.ErrorBoundary fallback={<div>{t('error_generic', 'Something went wrong.')}</div>}>
      <StyleSheetManager shouldForwardProp={isPropValid}>
        <PageWrapper theme={theme}>
          <FormCard
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            theme={theme}
          >
            <Header>
              <PageTitle>{t('log_batch_title', 'Log Catch Batch')}</PageTitle>
              <UserInfo>
                {user.name} ({user.role})
                <LogoutButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                >
                  <FontAwesomeIcon icon={faSignOutAlt} /> {t('logout', 'Logout')}
                </LogoutButton>
              </UserInfo>
            </Header>

            <FormGrid>
              {catches.map((catchItem, index) => (
                <CatchSection key={index}>
                  <SectionHeader>
                    <SectionTitle>
                      <FontAwesomeIcon icon={faQrcode} />
                      {t('catch', 'Catch')} #{index + 1}
                    </SectionTitle>
                    {catches.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCatch(index)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    )}
                  </SectionHeader>

                  <InputGroup>
                    <InputWrapper>
                      <Label>{t('species', 'Species')} *</Label>
                      <Select
                        value={catchItem.species}
                        onChange={(e) => setCatches(prev => prev.map((c, i) => i === index ? { ...c, species: e.target.value } : c))}
                      >
                        <option value="">{t('select_species', 'Select Species')}</option>
                        <option value="Tilapia">Tilapia</option>
                        <option value="Nile Perch">Nile Perch</option>
                        <option value="Dagaa">Dagaa</option>
                      </Select>
                    </InputWrapper>

                    <InputWrapper>
                      <Label>{t('weight_kg', 'Weight (kg)')} *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={catchItem.weight}
                        onChange={(e) => setCatches(prev => prev.map((c, i) => i === index ? { ...c, weight: e.target.value } : c))}
                      />
                    </InputWrapper>

                    <InputWrapper>
                      <Label>{t('date', 'Harvest Date')}</Label>
                      <Input
                        type="date"
                        value={catchItem.harvest_date}
                        onChange={(e) => setCatches(prev => prev.map((c, i) => i === index ? { ...c, harvest_date: e.target.value } : c))}
                      />
                    </InputWrapper>
                  </InputGroup>

                  <InputGroup style={{ marginTop: '1rem' }}>
                    <InputWrapper style={{ gridColumn: '1 / -1' }}>
                      <Label>
                        <FontAwesomeIcon
                          icon={locationStatus === 'loading' ? faSpinner : faMapMarkerAlt}
                          spin={locationStatus === 'loading'}
                          style={{ marginRight: '0.5rem' }}
                        />
                        {t('location', 'Location')}
                        {index === 0 && (
                          <span style={{ fontWeight: 'normal', color: '#6b7280', marginLeft: '0.5rem' }}>
                            ({locationStatus === 'success' ? 'Captured' : locationStatus === 'error' ? 'Failed' : 'Auto-capturing...'})
                          </span>
                        )}
                      </Label>
                      <Input
                        type="text"
                        value={catchItem.location}
                        onChange={(e) => setCatches(prev => prev.map((c, i) => i === index ? { ...c, location: e.target.value } : c))}
                      />
                    </InputWrapper>
                  </InputGroup>

                  <InputWrapper style={{ marginTop: '1rem' }}>
                    <Label>{t('notes', 'Notes')}</Label>
                    <TextArea
                      value={catchItem.notes}
                      onChange={(e) => setCatches(prev => prev.map((c, i) => i === index ? { ...c, notes: e.target.value } : c))}
                    />
                  </InputWrapper>

                  <div style={{ marginTop: '1rem' }}>
                    <Label>{t('images', 'Images')} ({catchItem.images.length}/5)</Label>
                    <ImageGrid>
                      {catchItem.images.map((img, imgIndex) => (
                        <ImagePreview key={imgIndex}>
                          <PreviewImg src={URL.createObjectURL(img)} alt="Catch" />
                          <RemoveImage onClick={() => removeImage(index, imgIndex)}>
                            <FontAwesomeIcon icon={faTimes} />
                          </RemoveImage>
                        </ImagePreview>
                      ))}
                      {catchItem.images.length < 5 && (
                        <CameraButton>
                          <FontAwesomeIcon icon={faCamera} size="2x" />
                          <span>{t('add_photo', 'Add Photo')}</span>
                          <HiddenInput
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handleImageChange(index, e.target.files)}
                          />
                        </CameraButton>
                      )}
                    </ImageGrid>
                  </div>
                </CatchSection>
              ))}

              <motion.button
                type="button"
                onClick={addCatch}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: 'none',
                  border: `2px dashed ${theme.primary || '#3b82f6'}`,
                  color: theme.primary || '#3b82f6',
                  padding: '1rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <FontAwesomeIcon icon={faPlus} />
                {t('add_another_catch', 'Add Another Catch')}
              </motion.button>
            </FormGrid>

            <ProgressBar>
              <ProgressFill
                animate={{ width: `${(catches.filter(c => c.species && c.weight).length / catches.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </ProgressBar>

            <ActionBar>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {catches.filter(c => c.species && c.weight).length} / {catches.length} {t('complete', 'complete')}
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <SubmitButton
                  danger
                  onClick={() => navigate('/fisherman-dashboard')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FontAwesomeIcon icon={faTimes} />
                  {t('cancel', 'Cancel')}
                </SubmitButton>
                <SubmitButton
                  onClick={handleSubmit}
                  disabled={isSubmitting || mutation.isPending}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isSubmitting || mutation.isPending ? (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  ) : (
                    <FontAwesomeIcon icon={faSave} />
                  )}
                  {isOnline ? t('submit_batch', 'Submit to Blockchain') : t('save_offline', 'Save Offline')}
                </SubmitButton>
                <SubmitButton
                  onClick={handlePrint}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FontAwesomeIcon icon={faPrint} />
                  {t('print_qr', 'Print QR')}
                </SubmitButton>
              </div>
            </ActionBar>

            {/* Hidden Print Area */}
            <div style={{ display: 'none' }}>
              <div ref={printRef}>
                {catches.map((c, i) => c.species && c.weight && (
                  <PrintArea key={i}>
                    <QRCode value={`${window.location.origin}/catch-details/offline-${i}`} size={200} />
                    <p style={{ margin: '1rem 0 0', fontWeight: 'bold' }}>
                      {c.species} - {c.weight} kg
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#666' }}>
                      {new Date(c.harvest_date).toLocaleDateString()}
                    </p>
                  </PrintArea>
                ))}
              </div>
            </div>
          </FormCard>

          <AnimatePresence>
            {toast && (
              <Toast
                type={toast.type}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
              >
                <FontAwesomeIcon icon={toast.type === 'success' ? faCheckCircle : faExclamationTriangle} />
                {toast.message}
              </Toast>
            )}
          </AnimatePresence>
        </PageWrapper>
      </StyleSheetManager>
    </Sentry.ErrorBoundary>
  );
};

export default LogCatchBatchForm;