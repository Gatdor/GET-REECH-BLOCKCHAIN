// src/components/Dashboard/NationalCatchMap.jsx
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFish, faCheckCircle, faTimesCircle, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import styled from 'styled-components';

const MapWrapper = styled.div`
  height: 700px;
  border-radius: 32px;
  overflow: hidden;
  box-shadow: 0 30px 80px rgba(0,0,0,0.4);
  border: 4px solid #10b981;
`;

const NationalCatchMap = ({ catches = [] }) => {
  // Only show catches with valid coordinates
  const validCatches = useMemo(() => 
    catches.filter(c => c.lat && c.lng && !isNaN(c.lat) && !isNaN(c.lng)),
    [catches]
  );

  const getMarkerIcon = (catchItem) => {
    const isVerified = catchItem.blockchain_transaction_hash || catchItem.status === 'approved';
    const isFraud = catchItem.status === 'rejected' || !catchItem.blockchain_transaction_hash;

    const iconHtml = renderToStaticMarkup(
      <div style={{
        background: isVerified ? '#10b981' : isFraud ? '#ef4444' : '#fbbf24',
        width: '50px',
        height: '50px',
        borderRadius: '50% 50% 50% 0',
        transform: 'rotate(-45deg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: '900',
        fontSize: '20px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
        border: '4px solid white'
      }}>
        <FontAwesomeIcon 
          icon={isVerified ? faCheckCircle : isFraud ? faTimesCircle : faExclamationTriangle}
          style={{ transform: 'rotate(45deg)' }}
        />
      </div>
    );

    return divIcon({
      html: iconHtml,
      className: '',
      iconSize: [50, 50],
      iconAnchor: [25, 50],
      popupAnchor: [0, -50],
    });
  };

  const center = validCatches.length > 0
    ? [validCatches[0].lat, validCatches[0].lng]
    : [-0.0236, 37.9062]; // Kenya center fallback

  return (
    <MapWrapper>
      <Container center={center} zoom={6} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {validCatches.map((catchItem) => {
          const isVerified = catchItem.blockchain_transaction_hash || catchItem.status === 'approved';
          
          return (
            <Marker
              key={catchItem.catch_id}
              position={[parseFloat(catchItem.lat), parseFloat(catchItem.lng)]}
              icon={getMarkerIcon(catchItem)}
            >
              <Popup>
                <div style={{ minWidth: '280px', fontFamily: 'Inter, sans-serif' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#1f2937' }}>
                    {catchItem.species || 'Unknown Species'}
                  </h3>
                  <p><strong>Fisherman:</strong> {catchItem.fisherman_name || 'Anonymous'}</p>
                  <p><strong>Weight:</strong> {catchItem.weight || catchItem.weight_kg} kg</p>
                  <p><strong>Date:</strong> {new Date(catchItem.harvest_date || catchItem.created_at).toLocaleDateString('sw-KE')}</p>
                  <p><strong>Catch ID:</strong> <code>{catchItem.catch_id}</code></p>
                  
                  {isVerified ? (
                    <p style={{ color: '#10b981', fontWeight: 'bold', marginTop: '10px' }}>
                      VERIFIED ON BLOCKCHAIN
                    </p>
                  ) : (
                    <p style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '10px' }}>
                      FRAUD DETECTED
                    </p>
                  )}

                  {catchItem.blockchain_transaction_hash && (
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${catchItem.blockchain_transaction_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#3b82f6', textDecoration: 'underline' }}
                    >
                      View Transaction
                    </a>
                  )}
                </div>
              </Popup>

              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                  <div>{catchItem.species}</div>
                  <div>{catchItem.weight || catchItem.weight_kg}kg</div>
                  <div style={{ 
                    color: isVerified ? '#10b981' : '#ef4444',
                    fontSize: '12px'
                  }}>
                    {isVerified ? 'VERIFIED' : 'FLAGGED'}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </Container>
    </MapWrapper>
  );
};

export default NationalCatchMap;