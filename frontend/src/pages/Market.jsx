// src/pages/Market.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFish, faQrcode, faMoneyBillWave, faMapMarkerAlt,
  faCheckCircle, faUser, faClock, faShieldAlt
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { toast, ToastContainer, Slide } from 'react-toastify';
import QRCode from 'react-qr-code';
import { AuthContext } from '../context/AuthContext';
import * as Sentry from '@sentry/react';

// SAME PROFESSIONAL DESIGN AS ADMIN DASHBOARD — NO SIDEBAR
const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  font-family: 'Inter', sans-serif;
  padding: 2rem;
`;

const Header = styled.div`
  text-align: center;
  background: white;
  padding: 2.5rem 2rem;
  border-radius: 24px;
  box-shadow: 0 15px 40px rgba(0,0,0,0.1);
  margin-bottom: 3rem;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
`;

const Title = styled.h1`
  font-size: 3.2rem;
  font-weight: 900;
  color: #0f172a;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
`;

const Subtitle = styled.p`
  font-size: 1.6rem;
  color: #475569;
  margin: 1rem 0 0;
  font-weight: 600;
`;

const SearchBar = styled.input`
  width: 100%;
  max-width: 700px;
  margin: 0 auto 3rem;
  padding: 1.4rem 2rem;
  font-size: 1.3rem;
  border: 3px solid #e2e8f0;
  border-radius: 20px;
  display: block;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.2);
  }
`;

const Section = styled.div`
  background: white;
  padding: 3rem;
  border-radius: 28px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.1);
  max-width: 1400px;
  margin: 0 auto 3rem;
`;

const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 2.5rem;
`;

const ProductCard = styled(motion.div)`
  background: white;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.15);
  border: 4px solid transparent;
  transition: all 0.4s ease;
  &:hover {
    transform: translateY(-16px);
    border-color: #10b981;
    box-shadow: 0 35px 80px rgba(16, 185, 129, 0.3);
  }
`;

const ProductImage = styled.div`
  height: 280px;
  background: url(${props => props.src || '/assets/fish-placeholder.jpg'}) center/cover no-repeat;
  position: relative;
`;

const VerifiedBadge = styled.div`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 0.8rem 1.5rem;
  border-radius: 50px;
  font-weight: 800;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
`;

const CardContent = styled.div`
  padding: 2.5rem;
`;

const Species = styled.h3`
  font-size: 2.4rem;
  font-weight: 900;
  color: #0f172a;
  margin: 0 0 1.2rem;
`;

const Price = styled.div`
  font-size: 3.2rem;
  font-weight: 900;
  color: #10b981;
  margin: 1.8rem 0;
`;

const Info = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  color: #475569;
  margin: 1rem 0;
  font-size: 1.2rem;
  font-weight: 600;
`;

const BuyButton = styled(motion.button)`
  width: 100%;
  padding: 1.6rem;
  border: none;
  border-radius: 20px;
  font-size: 1.5rem;
  font-weight: 800;
  color: white;
  cursor: pointer;
  margin-top: 1.5rem;
  background: ${props => props.danger ? '#ef4444' : 'linear-gradient(135deg, #10b981, #059669)'};
  box-shadow: 0 12px 35px rgba(16, 185, 129, 0.4);
`;

const Market = () => {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [catches, setCatches] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [qrItem, setQrItem] = useState(null);

  useEffect(() => {
    const fetchApprovedCatches = async () => {
      try {
        const token = localStorage.getItem('auth_token');

        // THIS IS THE ONLY CORRECT WAY — GETS ALL APPROVED CATCHES
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/catches`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          params: { status: 'approved' }
        });

        console.log('Raw data from API:', res.data); // ← CHECK THIS IN CONSOLE

        const approved = (res.data || [])
          .filter(c => c.status === 'approved' && (c.weight > 0 || c.batch_size > 0))
          .map(c => ({
            id: c.catch_id,
            species: c.species || 'Samaki',
            weight: c.weight || c.batch_size || 0,
            price_per_kg: Number(c.price) || 0,
            harvest_date: c.harvest_date,
            fisherman_name: c.fisherman_name || c.user?.name || 'Mvuvi FishKE',
            images: c.image_urls || [],
            location: 'Kenya',
          }));

        console.log('Approved catches for market:', approved);
        setCatches(approved);
      } catch (err) {
        console.error('Market fetch failed:', err.response || err);
        toast.error("Imeshindwa kupakia soko");
        Sentry.captureException(err);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedCatches();
  }, []);

  const filtered = catches.filter(item =>
    item.species.toLowerCase().includes(search.toLowerCase()) ||
    item.fisherman_name.toLowerCase().includes(search.toLowerCase())
  );

  const triggerMpesa = async (item) => {
    if (!user) {
      toast.error("Ingia kwanza ili ununue");
      return;
    }

    toast.loading("Inasubiri M-Pesa...");

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/mpesa/stk`, {
        phone: user.national_id?.replace('+', '') || user.phone,
        amount: item.price_per_kg * 10,
        catch_id: item.id,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });

      toast.dismiss();
      toast.success("Malipo yameanza! Angalia simu yako");
    } catch (err) {
      toast.dismiss();
      toast.error("Malipo yameshindwa");
    }
  };

  return (
    <>
      <PageWrapper>
        <Header>
          <Title>
            <FontAwesomeIcon icon={faFish} /> FishKE Market
          </Title>
          <Subtitle>
            Samaki Safi • Imeidhinishwa na Serikali • Moja kwa Moja kutoka Bahari
          </Subtitle>
        </Header>

        <input
          type="text"
          placeholder="Tafuta: Tilapia, Dagaa, Samaki Mkubwa, Mvuvi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '800px',
            margin: '0 auto 3rem',
            display: 'block',
            padding: '1.5rem 2rem',
            fontSize: '1.4rem',
            borderRadius: '24px',
            border: '3px solid #e2e8f0',
            boxShadow: '0 15px 40px rgba(0,0,0,0.1)',
          }}
        />

        <Section>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a' }}>
              Samaki Zilizoidhinishwa ({filtered.length})
            </h2>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '6rem' }}>
              <FontAwesomeIcon icon={faFish} size="5x" spin color="#10b981" />
              <p style={{ fontSize: '1.8rem', marginTop: '2rem' }}>Inapakia samaki safi kutoka baharini...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '8rem', color: '#64748b' }}>
              <FontAwesomeIcon icon={faFish} size="6x" />
              <h2 style={{ fontSize: '2.5rem', margin: '2rem 0' }}>Hakuna samaki sasa hivi</h2>
              <p style={{ fontSize: '1.5rem' }}>Wavuvi wanaloga kesho asubuhi. Rudi baadaye!</p>
            </div>
          ) : (
            <ProductGrid>
              {filtered.map(item => (
                <ProductCard
                  key={item.id}
                  initial={{ opacity: 0, y: 60 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.04 }}
                >
                  <ProductImage src={item.images[0]}>
                    <VerifiedBadge>
                      <FontAwesomeIcon icon={faShieldAlt} /> IMEIDHINISHWA
                    </VerifiedBadge>
                  </ProductImage>

                  <CardContent>
                    <Species>{item.species.toUpperCase()}</Species>

                    <Info>
                      <FontAwesomeIcon icon={faUser} /> {item.fisherman_name}
                    </Info>
                    <Info>
                      <FontAwesomeIcon icon={faMapMarkerAlt} /> {item.location}
                    </Info>
                    <Info>
                      <FontAwesomeIcon icon={faClock} /> {new Date(item.harvest_date).toLocaleDateString('sw-KE')}
                    </Info>

                    <Price>KES {item.price_per_kg.toLocaleString()}/kg</Price>

                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
                      Jumla: {item.weight}kg
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                      <BuyButton onClick={() => triggerMpesa(item)}>
                        <FontAwesomeIcon icon={faMoneyBillWave} /> NUNUA SASA
                      </BuyButton>
                      <BuyButton bg="#7c3aed" onClick={() => setQrItem(item)}>
                        <FontAwesomeIcon icon={faQrcode} /> QR CODE
                      </BuyButton>
                    </div>
                  </CardContent>
                </ProductCard>
              ))}
            </ProductGrid>
          )}
        </Section>
      </PageWrapper>

      {/* QR Modal */}
      {qrItem && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.97)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setQrItem(null)}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            style={{ background: 'white', padding: '4rem', borderRadius: '40px', textAlign: 'center', maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '3rem', fontWeight: '900', color: '#10b981', marginBottom: '2rem' }}>
              BLOCKCHAIN TRACE
            </h2>
            <QRCode value={`https://fishke.io/trace/${qrItem.id}`} size={340} />
            <div style={{ marginTop: '2.5rem' }}>
              <p style={{ fontSize: '4rem', fontWeight: '900', color: '#10b981' }}>
                KES {(qrItem.price_per_kg * 10).toLocaleString()}
              </p>
              <p style={{ fontSize: '2rem', fontWeight: '700' }}>{qrItem.species} • 10kg</p>
              <p style={{ color: '#64748b', marginTop: '1rem' }}>
                {qrItem.fisherman_name} • Imeidhinishwa
              </p>
            </div>
            <BuyButton danger onClick={() => setQrItem(null)}>
              FUNGA
            </BuyButton>
          </motion.div>
        </motion.div>
      )}

      <ToastContainer position="bottom-center" transition={Slide} />
    </>
  );
};

export default Market;