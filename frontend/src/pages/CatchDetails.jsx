// src/pages/CatchDetails.jsx
import React, { useContext, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { StyleSheetManager } from 'styled-components';
import isPropValid from '@emotion/is-prop-valid';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faShareAlt, faPrint } from '@fortawesome/free-solid-svg-icons';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useReactToPrint } from 'react-to-print';
import QRCode from 'react-qr-code';
import FsLightbox from 'fslightbox-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import * as Sentry from '@sentry/react';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const clampFontSize = (min, vw, max) => `clamp(${min}rem, ${vw}vw, ${max}rem)`;

// Styled Components (same as yours)
const DetailsWrapper = styled.div`
  padding: clamp(1rem, 5vw, 2rem);
  background: ${({ theme }) => theme.background || '#F3F4F6'};
  min-height: 100vh;
  color: ${({ theme }) => theme.text || '#1F2937'};
`;

const DetailsCard = styled.div`
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  background: ${({ theme }) => theme.cardBackground || '#FFFFFF'};
  padding: clamp(1.5rem, 4vw, 2.5rem);
  max-width: 900px;
  margin: 0 auto;
`;

const Header = styled.header`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
`;

const Title = styled.h1`
  font-size: ${clampFontSize(1.8, 5, 2.8)};
  font-weight: 800;
  color: #10b981;
`;

const ActionButton = styled(motion.button)`
  border-radius: 12px;
  background: ${({ theme }) => theme.primary || '#10b981'};
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
`;

const DetailItem = styled.div`
  background: #f8fafc;
  padding: 1rem;
  border-radius: 12px;
  p { margin: 0.5rem 0; }
  strong { color: #0f172a; }
`;

const ImageGallery = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
`;

const Image = styled.img`
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  &:hover { transform: scale(1.05); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
`;

const MapContainerStyled = styled(MapContainer)`
  height: 400px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  margin: 2rem 0;
`;

const QRWrapper = styled.div`
  background: white;
  padding: 1rem;
  border-radius: 16px;
  display: inline-block;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
`;

const pageVariants = { initial: { opacity: 0, y: 50 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -50 } };

const CatchDetails = () => {
  const { t } = useTranslation();
  const { catchId } = useParams();
  const navigate = useNavigate();
  const { user, isOnline, api } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  const componentRef = useRef<HTMLDivElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `FishKE_Catch_${catchId}`,
  });

  const { data: catchData, isLoading, error } = useQuery({
    queryKey: ['catch', catchId],
    queryFn: async () => {
      if (!isOnline) throw new Error("Offline – cannot load details");
      const { data } = await api.get(`/catch-logs/${catchId}`);
      return data;
    },
    enabled: !!user && !!catchId,
  });

  const { data: blockchainData } = useQuery({
    queryKey: ['blockchain', catchId],
    queryFn: async () => {
      const { data } = await api.get(`/blockchain/catch/${catchId}`);
      return data;
    },
    enabled: !!catchData && isOnline,
  });

  // WhatsApp share (NOW SAFE – only runs when catchData exists)
  const handleWhatsApp = () => {
    if (!catchData) return;
    const msg = `*FISHKE CATCH CERTIFICATE*\n\n` +
      `Species: ${catchData.species}\n` +
      `Weight: ${catchData.weight} kg\n` +
      `Price: KES ${catchData.price}\n` +
      `Catch ID: ${catchData.catch_id}\n\n` +
      `View full: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!user || user.role !== 'fisherman') {
    return <DetailsWrapper theme={theme}><h2 style={{textAlign: 'center', color: 'red'}}>Access Denied – Fishermen Only</h2></DetailsWrapper>;
  }

  if (isLoading) return <DetailsWrapper theme={theme}><p style={{textAlign: 'center', fontSize: '1.5rem'}}>Loading catch details...</p></DetailsWrapper>;
  if (error || !catchData) return <DetailsWrapper theme={theme}><p style={{textAlign: 'center', color: 'red'}}>Catch not found or offline</p></DetailsWrapper>;

  return (
    <StyleSheetManager shouldForwardProp={isPropValid}>
      <AnimatePresence>
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
          <DetailsWrapper theme={theme}>
            <div ref={componentRef}>
              <DetailsCard>
                <Header>
                  <Title>{catchData.species} • {catchData.weight}kg</Title>
                  <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                    <ActionButton onClick={() => navigate(-1)} whileHover={{scale: 1.05}} whileTap={{scale: 0.95}}>
                      <FontAwesomeIcon icon={faArrowLeft} /> Back
                    </ActionButton>
                    <ActionButton onClick={handlePrint} whileHover={{scale: 1.05}} whileTap={{scale: 0.95}}>
                      <FontAwesomeIcon icon={faPrint} /> Print
                    </ActionButton>
                    <ActionButton onClick={handleWhatsApp} whileHover={{scale: 1.05}} whileTap={{scale: 0.95}}>
                      <FontAwesomeIcon icon={faShareAlt} /> Share
                    </ActionButton>
                  </div>
                </Header>

                <DetailGrid>
                  <DetailItem><p><strong>Catch ID:</strong> {catchData.catch_id}</p></DetailItem>
                  <DetailItem><p><strong>Date:</strong> {new Date(catchData.harvest_date).toLocaleDateString('sw-KE')}</p></DetailItem>
                  <DetailItem><p><strong>Price:</strong> KES {Number(catchData.price).toLocaleString()}</p></DetailItem>
                  <DetailItem><p><strong>Status:</strong> <span style={{color: catchData.status === 'sold' ? 'green' : '#f59e0b', fontWeight: 'bold'}}>{catchData.status.toUpperCase()}</span></p></DetailItem>
                  <DetailItem><p><strong>Drying:</strong> {catchData.drying_method}</p></DetailItem>
                  <DetailItem><p><strong>Shelf Life:</strong> {catchData.shelf_life} days</p></DetailItem>
                </DetailGrid>

                {catchData.image_urls?.length > 0 && (
                  <ImageGallery>
                    {catchData.image_urls.map((url, i) => (
                      <Image
                        key={i}
                        src={url}
                        alt={`Catch photo ${i + 1}`}
                        onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                      />
                    ))}
                  </ImageGallery>
                )}

                {catchData.lat && catchData.lng && (
                  <MapContainerStyled center={[catchData.lat, catchData.lng]} zoom={13}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[catchData.lat, catchData.lng]}>
                      <Popup>{catchData.species} • {catchData.weight}kg</Popup>
                    </Marker>
                  </MapContainerStyled>
                )}

                {blockchainData?.transactionHash && (
                  <div style={{textAlign: 'center', margin: '2rem 0'}}>
                    <p><strong>On-Chain Verified</strong></p>
                    <a href={`https://sepolia.etherscan.io/tx/${blockchainData.transactionHash}`} target="_blank" rel="noreferrer">
                      View Transaction
                    </a>
                    <QRWrapper>
                      <QRCode value={`https://sepolia.etherscan.io/tx/${blockchainData.transactionHash}`} size={120} />
                    </QRWrapper>
                  </div>
                )}
              </DetailsCard>
            </div>

            <FsLightbox
              toggler={lightboxOpen}
              sources={catchData.image_urls || []}
              slide={lightboxIndex + 1}
            />
          </DetailsWrapper>
        </motion.div>
      </AnimatePresence>
    </StyleSheetManager>
  );
};

export default CatchDetails;