import React, { useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import * as Sentry from '@sentry/react';

const DetailsWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.background || '#f7fafc'} 0%,
    ${({ theme }) => theme.backgroundSecondary || '#e2e8f0'} 100%
  );
  padding: clamp(1rem, 3vw, 2rem);
`;

const DetailsCard = styled(motion.div)`
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: clamp(1.5rem, 3vw, 2rem);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid ${({ theme }) => theme.border || '#edf2f7'};
`;

const BackButton = styled(motion.button)`
  background: none;
  border: none;
  color: ${({ theme }) => theme.primary || '#2b6cb0'};
  cursor: pointer;
  font-size: clamp(0.9rem, 2vw, 1rem);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  transition: color 0.3s;
  &:hover {
    color: ${({ theme }) => theme.primaryHover || '#4299e1'};
  }
`;

const Title = styled.h2`
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 700;
  color: ${({ theme }) => theme.text || '#2d3748'};
  margin: 0 0 1.5rem;
`;

const DetailItem = styled.p`
  font-size: clamp(0.9rem, 2vw, 1rem);
  color: ${({ theme }) => theme.text || '#2d3748'};
  margin: 0.5rem 0;
`;

const ImageGallery = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const CatchImage = styled.img`
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border || '#edf2f7'};
`;

const ErrorMessage = styled(motion.p)`
  font-size: clamp(0.8rem, 2vw, 0.875rem);
  background: #fee2e2;
  color: #991b1b;
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  border-radius: 8px;
  text-align: center;
`;

const LoadingMessage = styled.p`
  font-size: clamp(0.9rem, 2vw, 1rem);
  color: ${({ theme }) => theme.text || '#2d3748'};
  text-align: center;
`;

const CatchDetails = () => {
  const { t } = useTranslation();
  const { id: catchId } = useParams();
  const navigate = useNavigate();
  const { getCatchById, user, isOnline } = useAuth();
  const { theme } = useContext(ThemeContext);

  const { data: catchData, isLoading, error } = useQuery({
    queryKey: ['catch', catchId],
    queryFn: async () => {
      if (!isOnline) throw new Error(t('DetailsErrorsOffline', 'You are offline. Please connect to the internet.'));
      if (!user) throw new Error(t('DetailsErrorsUnauthenticated', 'You must be logged in'));
      if (!getCatchById) throw new Error('getCatchById function is not available');
      console.log('[CatchDetails] Fetching catch with ID:', catchId);
      const response = await getCatchById(catchId);
      console.log('[CatchDetails] Catch Response:', response);
      const data = response.data || response || {};
      return {
        catch_id: parseInt(data.catch_id, 10) || parseInt(catchId, 10),
        batch_id: data.batch_id || 'N/A',
        user_id: String(data.user_id || user.id),
        species: data.species || 'Unknown',
        drying_method: data.drying_method || 'N/A',
        batch_size: Number(data.batch_size) || 0,
        weight: Number(data.weight) || 0,
        harvest_date: data.harvest_date || 'N/A',
        lat: Number(data.lat) || 0,
        lng: Number(data.lng) || 0,
        shelf_life: Number(data.shelf_life) || 0,
        price: Number(data.price) || 0,
        image_urls: Array.isArray(data.image_urls) ? data.image_urls : ['/assets/fallback-fish.jpg'],
        quality_score: Number(data.quality_score) || 0,
        status: data.status || 'pending',
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      };
    },
    enabled: !!user && !!catchId && isOnline && !!getCatchById,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    onError: (err) => {
      console.error('[CatchDetails] Fetch catch error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        catchId,
      });
      Sentry.captureException(err, { extra: { component: 'CatchDetails', catchId } });
    },
  });

  if (isLoading) {
    return (
      <DetailsWrapper theme={theme}>
        <DetailsCard>
          <LoadingMessage>{t('DetailsLoading', 'Loading catch details...')}</LoadingMessage>
        </DetailsCard>
      </DetailsWrapper>
    );
  }

  if (error || !catchData || catchData.catch_id === 0) {
    return (
      <DetailsWrapper theme={theme}>
        <DetailsCard>
          <BackButton
            onClick={() => navigate('/fisherman-dashboard')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            theme={theme}
          >
            <FontAwesomeIcon icon={faArrowLeft} /> {t('DetailsBack', 'Back to Dashboard')}
          </BackButton>
          <ErrorMessage
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            aria-live="assertive"
          >
            {error?.message || t('DetailsErrorsNotFound', 'Catch not found or an error occurred')}
          </ErrorMessage>
        </DetailsCard>
      </DetailsWrapper>
    );
  }

  return (
    <DetailsWrapper theme={theme}>
      <DetailsCard
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <BackButton
          onClick={() => navigate('/fisherman-dashboard')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          theme={theme}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> {t('DetailsBack', 'Back to Dashboard')}
        </BackButton>
        <Title>{t('DetailsTitle', 'Catch Details')}</Title>
        <DetailItem><strong>{t('DetailsCatchId', 'Catch ID')}:</strong> {catchData.catch_id}</DetailItem>
        <DetailItem><strong>{t('DetailsBatchId', 'Batch ID')}:</strong> {catchData.batch_id}</DetailItem>
        <DetailItem><strong>{t('DetailsSpecies', 'Species')}:</strong> {catchData.species}</DetailItem>
        <DetailItem><strong>{t('DetailsDryingMethod', 'Drying Method')}:</strong> {catchData.drying_method}</DetailItem>
        <DetailItem><strong>{t('DetailsBatchSize', 'Batch Size (kg)')}:</strong> {catchData.batch_size}</DetailItem>
        <DetailItem><strong>{t('DetailsWeight', 'Weight (kg)')}:</strong> {catchData.weight}</DetailItem>
        <DetailItem><strong>{t('DetailsHarvestDate', 'Harvest Date')}:</strong> {catchData.harvest_date}</DetailItem>
        <DetailItem><strong>{t('DetailsLocation', 'Location')}:</strong> {catchData.lat}, {catchData.lng}</DetailItem>
        <DetailItem><strong>{t('DetailsShelfLife', 'Shelf Life (days)')}:</strong> {catchData.shelf_life}</DetailItem>
        <DetailItem><strong>{t('DetailsPrice', 'Price (USD)')}:</strong> {catchData.price}</DetailItem>
        <DetailItem><strong>{t('DetailsQualityScore', 'Quality Score')}:</strong> {catchData.quality_score.toFixed(2)}</DetailItem>
        <DetailItem><strong>{t('DetailsStatus', 'Status')}:</strong> {catchData.status}</DetailItem>
        <DetailItem><strong>{t('DetailsCreatedAt', 'Created At')}:</strong> {new Date(catchData.created_at).toLocaleString()}</DetailItem>
        <DetailItem><strong>{t('DetailsUpdatedAt', 'Updated At')}:</strong> {new Date(catchData.updated_at).toLocaleString()}</DetailItem>
        {catchData.image_urls && catchData.image_urls.length > 0 && (
          <>
            <DetailItem><strong>{t('DetailsImages', 'Images')}:</strong></DetailItem>
            <ImageGallery>
              {catchData.image_urls.map((url, index) => (
                <CatchImage
                  key={index}
                  src={url}
                  alt={`${t('DetailsImageAlt', 'Catch image')} ${index + 1}`}
                  onError={(e) => (e.target.src = '/assets/fallback-fish.jpg')}
                />
              ))}
            </ImageGallery>
          </>
        )}
      </DetailsCard>
    </DetailsWrapper>
  );
};

export default CatchDetails;