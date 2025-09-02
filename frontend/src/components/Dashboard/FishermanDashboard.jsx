import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StyleSheetManager } from 'styled-components';
import isPropValid from '@emotion/is-prop-valid';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faSignOutAlt, faFilter, faEye } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { get, set } from 'idb-keyval';
import * as Sentry from '@sentry/react';

// Common Styles
const commonStyles = css`
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const clampFontSize = (min, vw, max) => `clamp(${min}rem, ${vw}vw, ${max}rem)`;

// Styled Components
const DashboardWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.background || '#F1F5F9'} 0%,
    ${({ theme }) => theme.backgroundSecondary || '#E2E8F0'} 100%
  );
  padding: clamp(1rem, 3vw, 2rem);
`;

const DashboardCard = styled(motion.div)`
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: clamp(1.5rem, 3vw, 2rem);
  ${commonStyles}
  max-width: 1200px;
  margin: 0 auto;
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  @media (max-width: 768px) {
    padding: clamp(1rem, 2vw, 1.25rem);
    margin: 0 clamp(0.5rem, 2vw, 1rem);
  }
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: clamp(1rem, 2vw, 1.5rem);
`;

const Title = styled.h2`
  font-size: ${clampFontSize(1.5, 3, 2)};
  font-weight: 700;
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  margin: 0;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 2vw, 1rem);
  font-size: ${clampFontSize(0.8, 2, 1)};
  color: ${({ theme }) => theme.text || '#1E3A8A'};
`;

const LogoutButton = styled(motion.button)`
  background: none;
  border: none;
  color: ${({ theme }) => theme.primary || '#3B82F6'};
  cursor: pointer;
  font-size: ${clampFontSize(0.8, 2, 1)};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Tabs = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const Tab = styled(motion.button)`
  padding: 0.5rem 1rem;
  border: none;
  background: ${({ active, theme }) => (active ? theme.primary : '#E5E7EB')};
  color: ${({ active, theme }) => (active ? '#fff' : theme.text || '#1F2937')};
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  &:hover {
    background: ${({ active, theme }) => (active ? theme.primaryHover : '#D1D5DB')};
  }
`;

const CatchList = styled.div`
  margin-bottom: 2rem;
`;

const CatchItem = styled(motion.div)`
  background: #fff;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
`;

const CatchDetails = styled.div`
  flex: 1;
`;

const CatchActions = styled.div`
  display: flex;
  gap: 0.5rem;
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
  font-size: ${clampFontSize(0.9, 2, 0.95)};
  color: ${({ theme }) => theme.text || '#1F2937'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
`;

const Button = styled(motion.button)`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.primary || '#1E3A8A'} 0%,
    ${({ theme }) => theme.primaryHover || '#3B82F6'} 100%
  );
  color: white;
  border: none;
  padding: clamp(0.75rem, 1.5vw, 1rem);
  border-radius: 8px;
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

const ResetButton = styled(motion.button)`
  padding: clamp(0.75rem, 1.5vw, 1rem);
  background: #E5E7EB;
  color: #1F2937;
  border: none;
  border-radius: 8px;
  font-size: ${clampFontSize(0.9, 2, 1)};
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: #D1D5DB;
  }
`;

const ErrorMessage = styled(motion.p)`
  font-size: ${clampFontSize(0.8, 2, 0.875)};
  background: #fee2e2;
  color: #991b1b;
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  border-radius: 8px;
  text-align: center;
`;

const SuccessMessage = styled(motion.p)`
  font-size: ${clampFontSize(0.8, 2, 0.875)};
  background: #d1fae5;
  color: #065f46;
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  border-radius: 8px;
  text-align: center;
`;

const ImagePreviews = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 112.5px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
`;

const pageVariants = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -50 },
};

// Mock function for image quality analysis
const analyzeImageQuality = async (file) => {
  console.log('[FishermanDashboard] Mock analyzeImageQuality:', file.name);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(Math.random() * 100);
    }, 500);
  });
};

const FishermanDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isOnline, logout, getCatches, uploadToIPFS, createCatch, createBatch, loading: authLoading, error: authError, setError } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('view');
  const [formData, setFormData] = useState({
    species: '',
    dryingMethod: '',
    batchSize: '',
    weight: '',
    harvestDate: '',
    lat: '',
    lng: '',
    shelfLife: '',
    price: '',
    images: [],
  });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [error, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [geoError, setGeoError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  console.log('[FishermanDashboard] Auth Context:', {
    user,
    isOnline,
    authLoading,
    authError,
    logout: !!logout,
    getCatches: !!getCatches,
    uploadToIPFS: !!uploadToIPFS,
    createCatch: !!createCatch,
    createBatch: !!createBatch,
  });

  // Fetch geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            lat: position.coords.latitude.toString(),
            lng: position.coords.longitude.toString(),
          }));
        },
        (err) => {
          setGeoError(t('DashboardErrorsGeolocation', 'Unable to retrieve location'));
          Sentry.captureException(err, { extra: { component: 'FishermanDashboard', action: 'geolocation' } });
        }
      );
    } else {
      setGeoError(t('DashboardErrorsGeolocationUnsupported', 'Geolocation is not supported'));
    }
  }, [t]);

  // Fetch catches
  const { data: catches, error: catchesError, isLoading: catchesLoading } = useQuery({
    queryKey: ['catches', user?.id, filterStatus],
    queryFn: async () => {
      if (!isOnline) throw new Error(t('DashboardErrorsOffline', 'You are offline. Please connect to the internet.'));
      if (!user) throw new Error(t('DashboardErrorsUnauthenticated', 'You must be logged in'));
      if (!getCatches) throw new Error('getCatches function is not available');
      const response = await Promise.race([
        getCatches(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 30000)),
      ]);
      console.log('[FishermanDashboard] Catches Response:', response);
      let data = Array.isArray(response.data) ? response.data : response.data.data || [];
      if (!Array.isArray(data)) {
        console.warn('[FishermanDashboard] Catches data is not an array:', data);
        data = [];
      }
      console.log('[FishermanDashboard] Raw catches data:', data);
      if (filterStatus) {
        data = data.filter((catchItem) => catchItem.status === filterStatus);
      }
      const mappedCatches = data.map((catchItem) => {
        const catchId = parseInt(catchItem.catch_id, 10);
        console.log('[FishermanDashboard] Mapping catch:', {
          id: catchItem.id,
          catch_id: catchItem.catch_id,
          parsedId: catchId,
          isValid: Number.isInteger(catchId) && catchId > 0,
        });
        return {
          catch_id: Number.isInteger(catchId) ? catchId : 0,
          batch_id: catchItem.batch_id || `BATCH_${Date.now()}`,
          user_id: String(catchItem.user_id || user.id),
          species: catchItem.species || 'Unknown',
          drying_method: catchItem.drying_method || 'N/A',
          batch_size: Number(catchItem.batch_size) || 0,
          weight: Number(catchItem.weight) || 0,
          harvest_date: catchItem.harvest_date || 'N/A',
          lat: Number(catchItem.lat) || 0,
          lng: Number(catchItem.lng) || 0,
          shelf_life: Number(catchItem.shelf_life) || 0,
          price: Number(catchItem.price) || 0,
          image_urls: Array.isArray(catchItem.image_urls) ? catchItem.image_urls : ['/assets/fallback-fish.jpg'],
          quality_score: Number(catchItem.quality_score) || 0,
          status: catchItem.status || 'pending',
          created_at: catchItem.created_at || new Date().toISOString(),
          updated_at: catchItem.updated_at || new Date().toISOString(),
        };
      });
      const filteredCatches = mappedCatches.filter((item) => Number.isInteger(item.catch_id) && item.catch_id > 0);
      console.log('[FishermanDashboard] Mapped catches:', mappedCatches);
      console.log('[FishermanDashboard] Filtered catches:', filteredCatches);
      return filteredCatches;
    },
    enabled: !!user && user.role === 'fisherman' && isOnline && !authLoading && !!getCatches,
    retry: 0,
    staleTime: 5 * 60 * 1000,
    onError: (err) => {
      console.error('[FishermanDashboard] Fetch catches error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      Sentry.captureException(err, { extra: { component: 'FishermanDashboard', query: 'catches' } });
      setLocalError(err.message || t('DashboardErrorsNetwork', 'Network error. Please try again.'));
    },
  });

  const validateForm = () => {
    if (!formData.species) return t('DashboardErrorsSpeciesRequired', 'Species is required');
    if (!formData.dryingMethod) return t('DashboardErrorsDryingMethodRequired', 'Drying method is required');
    if (!formData.batchSize || formData.batchSize <= 0) return t('DashboardErrorsInvalidBatchSize', 'Batch size must be greater than 0');
    if (!formData.weight || formData.weight <= 0) return t('DashboardErrorsInvalidWeight', 'Weight must be greater than 0');
    if (!formData.harvestDate) return t('DashboardErrorsHarvestDateRequired', 'Harvest date is required');
    if (!formData.lat || !formData.lng) return t('DashboardErrorsLocationRequired', 'Location is required');
    if (!formData.shelfLife || formData.shelfLife <= 0) return t('DashboardErrorsInvalidShelfLife', 'Shelf life must be greater than 0');
    if (!formData.price || formData.price <= 0) return t('DashboardErrorsInvalidPrice', 'Price must be greater than 0');
    return '';
  };

  const logCatchMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error(t('DashboardErrorsUnauthenticated', 'You must be logged in'));
      }
      if (!isOnline) {
        const offlineData = {
          ...formData,
          batch_id: `BATCH_${Date.now()}`,
          user_id: user.id,
          batch_size: parseFloat(formData.batchSize),
          weight: parseFloat(formData.weight),
          shelf_life: parseInt(formData.shelfLife, 10),
          price: parseFloat(formData.price),
          image_urls: null,
        };
        await set('offlineActions', [
          ...(await get('offlineActions') || []),
          { type: 'catch_log', data: offlineData },
        ]);
        return { message: t('DashboardSuccessOffline', 'Catch saved offline') };
      }

      if (!uploadToIPFS || !createCatch || !createBatch) {
        const errorMessage = 'Required functions (uploadToIPFS, createCatch, or createBatch) are not available';
        console.error('[FishermanDashboard] Mutation error:', errorMessage);
        Sentry.captureException(new Error(errorMessage), { extra: { component: 'FishermanDashboard', action: 'logCatch' } });
        throw new Error(errorMessage);
      }

      let imageUrls = null;
      let qualityScores = [0];
      if (formData.images && formData.images.length > 0) {
        console.log('[FishermanDashboard] Processing images:', {
          count: formData.images.length,
          files: formData.images.map((f) => ({
            name: f.name,
            type: f.type,
            size: f.size,
          })),
        });
        imageUrls = await Promise.all(
          formData.images.map(async (file) => {
            console.log('[FishermanDashboard] Uploading file:', {
              name: file.name,
              type: file.type,
              size: file.size,
            });
            try {
              const url = await uploadToIPFS(file);
              console.log('[FishermanDashboard] Image uploaded to IPFS:', url);
              return url;
            } catch (err) {
              console.error('[FishermanDashboard] Image upload error:', {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data,
                fileName: file.name,
              });
              Sentry.captureException(err, { extra: { component: 'FishermanDashboard', action: 'uploadToIPFS', fileName: file.name } });
              throw err;
            }
          })
        );
        qualityScores = await Promise.all(formData.images.map((file) => analyzeImageQuality(file)));
      } else {
        console.log('[FishermanDashboard] No images provided, proceeding without uploads');
      }

      const averageQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / Math.max(1, qualityScores.length);

      const data = {
        batch_id: `BATCH_${Date.now()}`,
        user_id: user.id,
        species: formData.species,
        drying_method: formData.dryingMethod,
        batch_size: parseFloat(formData.batchSize),
        weight: parseFloat(formData.weight),
        harvest_date: formData.harvestDate,
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
        shelf_life: parseInt(formData.shelfLife, 10),
        price: parseFloat(formData.price),
        image_urls: imageUrls,
        quality_score: averageQualityScore,
        status: 'pending',
      };

      const blockchainResult = await createBatch(data);
      console.log('[FishermanDashboard] Blockchain result:', blockchainResult);

      const response = await createCatch(data);
      console.log('[FishermanDashboard] Catch logged:', response);
      return response;
    },
    onSuccess: (data) => {
      setSuccess(t('DashboardSuccess', 'Catch logged successfully'));
      setFormData({
        species: '',
        dryingMethod: '',
        batchSize: '',
        weight: '',
        harvestDate: '',
        lat: formData.lat,
        lng: formData.lng,
        shelfLife: '',
        price: '',
        images: [],
      });
      setImagePreviews([]);
      queryClient.invalidateQueries(['catches', user?.id]);
    },
    onError: (err) => {
      console.error('[FishermanDashboard] Log catch error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      Sentry.captureException(err, { extra: { component: 'FishermanDashboard', action: 'createCatch' } });
      setLocalError(err.message || t('DashboardErrorsGeneric', 'Failed to log catch'));
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setLocalError('');
    setSuccess('');
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    console.log('[FishermanDashboard] Files selected:', {
      count: files.length,
      files: files.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
      })),
    });
    setFormData((prev) => ({ ...prev, images: files }));
    setImagePreviews(files.map((file) => URL.createObjectURL(file)));
    setLocalError('');
    setSuccess('');
  };

  const handleReset = () => {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setFormData({
      species: '',
      dryingMethod: '',
      batchSize: '',
      weight: '',
      harvestDate: '',
      lat: formData.lat,
      lng: formData.lng,
      shelfLife: '',
      price: '',
      images: [],
    });
    setImagePreviews([]);
    setLocalError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setLocalError(t('DashboardErrorsUnauthenticated', 'You must be logged in'));
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    logCatchMutation.mutate();
  };

  const handleViewCatch = (catchId) => {
    if (!Number.isInteger(parseInt(catchId, 10))) {
      console.error('[FishermanDashboard] Invalid catchId:', catchId);
      Sentry.captureMessage('Invalid catchId in FishermanDashboard', { extra: { catchId, component: 'FishermanDashboard' } });
      return;
    }
    navigate(`/catch-details/${catchId}`);
  };

  const renderedCatches = useMemo(() => {
    console.log('[FishermanDashboard] Rendering catches:', catches);
    if (authLoading || catchesLoading) {
      console.log('[FishermanDashboard] RenderedCatches: Loading state');
      return <p>{t('DashboardLoading', 'Loading catches...')}</p>;
    }
    if (authError) {
      console.log('[FishermanDashboard] RenderedCatches: Auth error', authError);
      setLocalError(authError);
      return <ErrorMessage>{authError}</ErrorMessage>;
    }
    if (catchesError) {
      console.log('[FishermanDashboard] RenderedCatches: Catches error', catchesError.message);
      return <ErrorMessage>{catchesError.message}</ErrorMessage>;
    }
    if (!catches || catches.length === 0) {
      console.log('[FishermanDashboard] RenderedCatches: No catches');
      return <p>{t('DashboardNoCatches', 'No catches found')}</p>;
    }

    console.log('[FishermanDashboard] RenderedCatches: Rendering catch items', catches);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        {catches.map((catchItem) => {
          console.log('[FishermanDashboard] Rendering catch item:', catchItem);
          return (
            <CatchItem key={catchItem.catch_id}>
              <CatchDetails>
                <p><strong>{t('DashboardSpecies', 'Species')}:</strong> {catchItem.species}</p>
                <p><strong>{t('DashboardBatchId', 'Batch ID')}:</strong> {catchItem.batch_id}</p>
                <p><strong>{t('DashboardStatus', 'Status')}:</strong> {catchItem.status}</p>
                <p><strong>{t('DashboardHarvestDate', 'Harvest Date')}:</strong> {catchItem.harvest_date}</p>
                <p><strong>{t('DashboardQualityScore', 'Quality Score')}:</strong> {catchItem.quality_score.toFixed(2)}</p>
              </CatchDetails>
              <CatchActions>
                <Button
                  onClick={() => handleViewCatch(catchItem.catch_id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FontAwesomeIcon icon={faEye} /> {t('DashboardView', 'View')}
                </Button>
              </CatchActions>
            </CatchItem>
          );
        })}
      </motion.div>
    );
  }, [catches, catchesLoading, catchesError, authLoading, authError, t, navigate]);

  return (
    <StyleSheetManager shouldForwardProp={isPropValid}>
      <AnimatePresence>
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.5 }}
        >
          <DashboardWrapper theme={theme}>
            <DashboardCard>
              <Header>
                <Title>{t('DashboardTitle', 'Fisherman Dashboard')}</Title>
                <UserInfo>
                  {user?.name || 'User'} ({user?.role || 'N/A'})
                  <LogoutButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      try {
                        await logout();
                        navigate('/login', { replace: true });
                      } catch (err) {
                        setLocalError(t('DashboardErrorsLogout', 'Failed to logout. Please try again.'));
                      }
                    }}
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} /> {t('DashboardLogout', 'Logout')}
                  </LogoutButton>
                </UserInfo>
              </Header>
              <Tabs>
                <Tab active={activeTab === 'view'} onClick={() => setActiveTab('view')}>
                  {t('DashboardViewCatches', 'View Catches')}
                </Tab>
                <Tab active={activeTab === 'log'} onClick={() => setActiveTab('log')}>
                  {t('DashboardLogCatch', 'Log New Catch')}
                </Tab>
              </Tabs>
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
                {geoError && (
                  <ErrorMessage
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    role="alert"
                    aria-live="assertive"
                  >
                    {geoError}
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
              {activeTab === 'view' && (
                <CatchList>
                  <FormGroup>
                    <Label htmlFor="filterStatus">
                      {t('DashboardFilterStatus', 'Filter by Status')}
                      <FontAwesomeIcon
                        icon={faFilter}
                        data-tooltip-id="filterStatus-tip"
                        data-tooltip-content={t('DashboardTooltipsFilterStatus', 'Filter catches by status')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Select
                      id="filterStatus"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="">{t('DashboardAllStatuses', 'All Statuses')}</option>
                      <option value="pending">{t('DashboardStatusPending', 'Pending')}</option>
                      <option value="approved">{t('DashboardStatusApproved', 'Approved')}</option>
                      <option value="rejected">{t('DashboardStatusRejected', 'Rejected')}</option>
                    </Select>
                    <Tooltip id="filterStatus-tip" />
                  </FormGroup>
                  {renderedCatches}
                </CatchList>
              )}
              {activeTab === 'log' && (
                <Form onSubmit={handleSubmit}>
                  <FormGroup>
                    <Label htmlFor="species">
                      {t('DashboardSpecies', 'Species')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="species-tip"
                        data-tooltip-content={t('DashboardTooltipsSpecies', 'Select the fish species')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Select
                      id="species"
                      name="species"
                      value={formData.species}
                      onChange={handleChange}
                      required
                      aria-describedby="species-tip"
                    >
                      <option value="">{t('DashboardPlaceholdersSpecies', 'Select species')}</option>
                      <option value="Tilapia">{t('DashboardSpeciesTilapia', 'Tilapia')}</option>
                      <option value="Nile Perch">{t('DashboardSpeciesNilePerch', 'Nile Perch')}</option>
                      <option value="Dagaa">{t('DashboardSpeciesDagaa', 'Dagaa')}</option>
                    </Select>
                    <Tooltip id="species-tip" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="dryingMethod">
                      {t('DashboardDryingMethod', 'Drying Method')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="dryingMethod-tip"
                        data-tooltip-content={t('DashboardTooltipsDryingMethod', 'Select the drying method')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Select
                      id="dryingMethod"
                      name="dryingMethod"
                      value={formData.dryingMethod}
                      onChange={handleChange}
                      required
                      aria-describedby="dryingMethod-tip"
                    >
                      <option value="">{t('DashboardPlaceholdersDryingMethod', 'Select drying method')}</option>
                      <option value="Sun">{t('DashboardDryingMethodsSun', 'Sun')}</option>
                      <option value="Solar">{t('DashboardDryingMethodsSolar', 'Solar')}</option>
                      <option value="Smoke">{t('DashboardDryingMethodsSmoke', 'Smoke')}</option>
                    </Select>
                    <Tooltip id="dryingMethod-tip" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="batchSize">
                      {t('DashboardBatchSize', 'Batch Size (kg)')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="batchSize-tip"
                        data-tooltip-content={t('DashboardTooltipsBatchSize', 'Enter batch size in kilograms')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Input
                      id="batchSize"
                      type="number"
                      name="batchSize"
                      value={formData.batchSize}
                      onChange={handleChange}
                      placeholder={t('DashboardPlaceholdersBatchSize', 'Enter batch size')}
                      required
                      min="0.1"
                      step="0.1"
                      aria-describedby="batchSize-tip"
                    />
                    <Tooltip id="batchSize-tip" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="weight">
                      {t('DashboardWeight', 'Weight (kg)')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="weight-tip"
                        data-tooltip-content={t('DashboardTooltipsWeight', 'Enter total weight in kilograms')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      placeholder={t('DashboardPlaceholdersWeight', 'Enter weight')}
                      required
                      min="0.1"
                      step="0.1"
                      aria-describedby="weight-tip"
                    />
                    <Tooltip id="weight-tip" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="harvestDate">
                      {t('DashboardHarvestDate', 'Harvest Date')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="harvestDate-tip"
                        data-tooltip-content={t('DashboardTooltipsHarvestDate', 'Select the harvest date')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Input
                      id="harvestDate"
                      type="date"
                      name="harvestDate"
                      value={formData.harvestDate}
                      onChange={handleChange}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      aria-describedby="harvestDate-tip"
                    />
                    <Tooltip id="harvestDate-tip" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="lat">
                      {t('DashboardLocationLat', 'Latitude')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="lat-tip"
                        data-tooltip-content={t('DashboardTooltipsLat', 'Enter latitude')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Input
                      id="lat"
                      type="number"
                      name="lat"
                      value={formData.lat}
                      onChange={handleChange}
                      placeholder={t('DashboardPlaceholdersLat', 'Enter latitude')}
                      required
                      step="any"
                      min="-90"
                      max="90"
                      aria-describedby="lat-tip"
                    />
                    <Tooltip id="lat-tip" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="lng">
                      {t('DashboardLocationLng', 'Longitude')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="lng-tip"
                        data-tooltip-content={t('DashboardTooltipsLng', 'Enter longitude')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Input
                      id="lng"
                      type="number"
                      name="lng"
                      value={formData.lng}
                      onChange={handleChange}
                      placeholder={t('DashboardPlaceholdersLng', 'Enter longitude')}
                      required
                      step="any"
                      min="-180"
                      max="180"
                      aria-describedby="lng-tip"
                    />
                    <Tooltip id="lng-tip" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="shelfLife">
                      {t('DashboardShelfLife', 'Shelf Life (days)')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="shelfLife-tip"
                        data-tooltip-content={t('DashboardTooltipsShelfLife', 'Enter shelf life in days')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Input
                      id="shelfLife"
                      type="number"
                      name="shelfLife"
                      value={formData.shelfLife}
                      onChange={handleChange}
                      placeholder={t('DashboardPlaceholdersShelfLife', 'Enter shelf life')}
                      required
                      min="1"
                      max="365"
                      aria-describedby="shelfLife-tip"
                    />
                    <Tooltip id="shelfLife-tip" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="price">
                      {t('DashboardPrice', 'Price (USD)')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="price-tip"
                        data-tooltip-content={t('DashboardTooltipsPrice', 'Enter price in USD')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder={t('DashboardPlaceholdersPrice', 'Enter price')}
                      required
                      min="0.01"
                      step="0.01"
                      aria-describedby="price-tip"
                    />
                    <Tooltip id="price-tip" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="images">
                      {t('DashboardImages', 'Images (optional, JPEG/PNG, max 5MB)')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="images-tip"
                        data-tooltip-content={t('DashboardTooltipsImages', 'Upload catch images (optional, JPEG/PNG, max 5MB)')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Input
                      id="images"
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      capture="environment"
                      multiple
                      onChange={handleImageUpload}
                      aria-describedby="images-tip"
                    />
                    <Tooltip id="images-tip" />
                    <ImagePreviews>
                      {imagePreviews.map((url, index) => (
                        <PreviewImage
                          key={index}
                          src={url}
                          alt={`${t('DashboardImagePreview', 'Image preview')} ${index + 1}`}
                          onError={(e) => (e.target.src = '/assets/fallback-fish.jpg')}
                        />
                      ))}
                    </ImagePreviews>
                  </FormGroup>
                  <div style={{ display: 'flex', gap: clampFontSize(0.5, 2, 0.75), justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button
                      type="submit"
                      disabled={logCatchMutation.isLoading}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      aria-label={logCatchMutation.isLoading ? t('DashboardSubmitting', 'Submitting...') : t('DashboardSubmit', 'Submit Catch')}
                    >
                      {logCatchMutation.isLoading ? t('DashboardSubmitting', 'Submitting...') : t('DashboardSubmit', 'Submit Catch')}
                    </Button>
                    <ResetButton
                      type="button"
                      onClick={handleReset}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      aria-label={t('DashboardReset', 'Reset')}
                    >
                      {t('DashboardReset', 'Reset')}
                    </ResetButton>
                  </div>
                </Form>
              )}
            </DashboardCard>
          </DashboardWrapper>
        </motion.div>
      </AnimatePresence>
    </StyleSheetManager>
  );
};

export default FishermanDashboard;