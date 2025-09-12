import React, { useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { StyleSheetManager } from 'styled-components';
import isPropValid from '@emotion/is-prop-valid';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faMap } from '@fortawesome/free-solid-svg-icons';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import * as Sentry from '@sentry/react';

// Fix Leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const clampFontSize = (min, vw, max) => `clamp(${min}rem, ${vw}vw, ${max}rem)`;

// Styled Components
const DetailsWrapper = styled.div`
  padding: clamp(1rem, 5vw, 2rem);
  background: ${({ theme }) => theme.background || '#F3F4F6'};
  min-height: 100vh;
  color: ${({ theme }) => theme.text || '#1F2937'};
`;

const DetailsCard = styled.div`
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: ${({ theme }) => theme.cardBackground || '#FFFFFF'};
  padding: clamp(1rem, 3vw, 1.5rem);
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: clamp(0.5rem, 2vw, 1rem);
  margin-bottom: clamp(1rem, 4vw, 2rem);
`;

const Title = styled.h1`
  font-size: ${clampFontSize(1.5, 4, 2.25)};
  font-weight: 700;
`;

const BackButton = styled(motion.button)`
  border-radius: 8px;
  background: ${({ theme }) => theme.secondary || '#6B7280'};
  color: #FFFFFF;
  padding: clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem);
  border: none;
  cursor: pointer;
  font-size: ${clampFontSize(0.875, 2, 1)};
`;

const DetailItem = styled.div`
  margin: clamp(0.5rem, 2vw, 1rem) 0;
  p {
    font-size: ${clampFontSize(0.875, 2, 1)};
    margin: 0.25rem 0;
  }
  strong {
    font-weight: 600;
  }
`;

const ImageGallery = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: clamp(0.5rem, 2vw, 1rem);
  margin-top: clamp(1rem, 4vw, 2rem);
`;

const Image = styled.img`
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
`;

const MapContainerStyled = styled(MapContainer)`
  height: 300px;
  width: 100%;
  border-radius: 8px;
  margin-top: clamp(1rem, 4vw, 2rem);
`;

const ErrorMessage = styled(motion.p)`
  color: ${({ theme }) => theme.danger || '#EF4444'};
  font-size: ${clampFontSize(0.875, 2, 1)};
  text-align: center;
`;

const pageVariants = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -50 },
};

const CatchDetails = () => {
  const { t } = useTranslation();
  const { catchId } = useParams();
  const navigate = useNavigate();
  const { user, isOnline, api } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  const { data: catchData, error, isLoading } = useQuery({
    queryKey: ['catch', catchId],
    queryFn: async () => {
      if (!isOnline) throw new Error(t('DashboardErrorsOffline', 'You are offline. Please connect to the internet.'));
      if (!user) throw new Error(t('DashboardErrorsUnauthenticated', 'You must be logged in'));
      const response = await api.get(`/catch-logs/${catchId}`);
      return response.data;
    },
    enabled: !!user && user.role === 'fisherman' && isOnline,
    retry: 0,
    onError: (err) => {
      console.error('[CatchDetails] Fetch catch error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      Sentry.captureException(err, { extra: { component: 'CatchDetails', catchId } });
    },
  });

  const { data: blockchainData } = useQuery({
    queryKey: ['blockchainCatch', catchId],
    queryFn: async () => {
      if (!isOnline) return {};
      const response = await api.get(`/blockchain/catch/${catchId}`);
      return response.data;
    },
    enabled: !!user && user.role === 'fisherman' && isOnline,
    retry: 0,
  });

  if (!user || user.role !== 'fisherman') {
    return <ErrorMessage>{t('DashboardErrorsAccessDenied', 'Access denied: Only fishermen can access this page')}</ErrorMessage>;
  }

  if (isLoading) {
    return <DetailsWrapper><p>{t('DashboardLoading', 'Loading catch details...')}</p></DetailsWrapper>;
  }

  if (error) {
    return <DetailsWrapper><ErrorMessage>{error.message || t('DashboardErrorsGeneric', 'Failed to load catch details')}</ErrorMessage></DetailsWrapper>;
  }

  if (!catchData) {
    return <DetailsWrapper><ErrorMessage>{t('DashboardErrorsNoCatch', 'Catch not found')}</ErrorMessage></DetailsWrapper>;
  }

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
          <DetailsWrapper theme={theme}>
            <DetailsCard>
              <Header>
                <Title>{t('CatchDetailsTitle', 'Catch Details')} - {catchData.catch_id}</Title>
                <BackButton
                  onClick={() => navigate('/fisherman-dashboard')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FontAwesomeIcon icon={faArrowLeft} /> {t('CatchDetailsBack', 'Back to Dashboard')}
                </BackButton>
              </Header>
              <DetailItem>
                <p><strong>{t('DashboardSpecies', 'Species')}:</strong> {catchData.species}</p>
                <p><strong>{t('DashboardCatchId', 'Catch ID')}:</strong> {catchData.catch_id}</p>
                <p><strong>{t('DashboardStatus', 'Status')}:</strong> {catchData.status}</p>
                <p><strong>{t('DashboardHarvestDate', 'Harvest Date')}:</strong> {catchData.harvest_date}</p>
                <p><strong>{t('DashboardBatchSize', 'Batch Size')}:</strong> {catchData.batch_size} kg</p>
                <p><strong>{t('DashboardWeight', 'Weight')}:</strong> {catchData.weight} kg</p>
                <p><strong>{t('DashboardDryingMethod', 'Drying Method')}:</strong> {catchData.drying_method}</p>
                <p><strong>{t('DashboardShelfLife', 'Shelf Life')}:</strong> {catchData.shelf_life} days</p>
                <p><strong>{t('DashboardPrice', 'Price')}:</strong> ${catchData.price}</p>
                <p><strong>{t('DashboardLatitude', 'Latitude')}:</strong> {catchData.lat}</p>
                <p><strong>{t('DashboardLongitude', 'Longitude')}:</strong> {catchData.lng}</p>
                {blockchainData?.transactionHash && (
                  <p><strong>{t('DashboardBlockchainHash', 'Blockchain Transaction Hash')}:</strong> {blockchainData.transactionHash}</p>
                )}
              </DetailItem>
              {catchData.image_urls && catchData.image_urls.length > 0 && (
                <ImageGallery>
                  {catchData.image_urls.map((url, index) => (
                    <Image
                      key={index}
                      src={url}
                      alt={`${t('DashboardImagePreview', 'Catch image')} ${index + 1}`}
                      onError={(e) => (e.target.src = '/assets/fallback-fish.jpg')}
                    />
                  ))}
                </ImageGallery>
              )}
              {catchData.lat && catchData.lng && !isNaN(catchData.lat) && !isNaN(catchData.lng) && (
                <MapContainerStyled center={[catchData.lat, catchData.lng]} zoom={12} scrollWheelZoom={false}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={[catchData.lat, catchData.lng]}>
                    <Popup>
                      <strong>{t('DashboardSpecies', 'Species')}:</strong> {catchData.species}<br />
                      <strong>{t('DashboardCatchId', 'Catch ID')}:</strong> {catchData.catch_id}
                    </Popup>
                  </Marker>
                </MapContainerStyled>
              )}
            </DetailsCard>
          </DetailsWrapper>
        </motion.div>
      </AnimatePresence>
    </StyleSheetManager>
  );
};

export default CatchDetails;