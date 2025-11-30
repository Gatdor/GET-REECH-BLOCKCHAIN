// src/components/Dashboard/AdminDashboard.jsx
import React, { useContext, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFish, faUsers, faBoxOpen, faChartBar, faSignOutAlt,
  faBars, faCheckCircle, faClock, faHome, faDownload, faQrcode
} from '@fortawesome/free-solid-svg-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bar } from 'react-chartjs-2';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import * as Sentry from '@sentry/react';

// Fix Leaflet icons
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

const DashboardContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  font-family: 'Inter', sans-serif;
`;

const Sidebar = styled(motion.aside)`
  width: 280px;
  background: #0f172a;
  color: white;
  padding: 2rem 1.5rem;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 1000;
  @media (max-width: 768px) {
    position: fixed;
    transform: ${({ isOpen }) => (isOpen ? 'translateX(0)' : 'translateX(-100%)')};
    transition: transform 0.4s ease;
  }
`;

const SidebarLink = styled(motion.div)`
  padding: 1rem;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  margin: 0.5rem 0;
  background: ${({ active }) => active ? '#10b981' : 'transparent'};
  font-weight: ${({ active }) => active ? '700' : '500'};
  &:hover { background: #1e293b; }
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1.5rem 2rem;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  margin-bottom: 2rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const StatCard = styled(motion.div)`
  background: white;
  padding: 2rem;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 3.5rem;
  font-weight: 900;
  color: #10b981;
`;

const Section = styled.div`
  background: white;
  padding: 2.5rem;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  margin-bottom: 2rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
`;

const Th = styled.th`
  padding: 1rem;
  background: #0f172a;
  color: white;
  text-align: left;
`;

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
`;

const ActionButton = styled(motion.button)`
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 12px;
  margin: 0 0.25rem;
  cursor: pointer;
  font-weight: 600;
  background: ${({ reject }) => reject ? '#ef4444' : '#10b981'};
  color: white;
`;

const AdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout, getCatches, approveCatch } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch all catches
  const { data: allCatches = [], isLoading: loadingAll } = useQuery({
    queryKey: ['adminAllCatches'],
    queryFn: getCatches,
    enabled: !!user && user.role === 'admin',
  });

  // Pending only
  const { data: pendingCatches = [], isLoading: loadingPending } = useQuery({
    queryKey: ['adminPendingCatches'],
    queryFn: () => getCatches({ status: 'pending' }),
    enabled: !!user && user.role === 'admin',
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: approveCatch,
    onSuccess: () => {
      queryClient.invalidateQueries(['adminAllCatches']);
      queryClient.invalidateQueries(['adminPendingCatches']);
      toast.success("Catch imeidhinishwa!");
    },
    onError: (err) => {
      toast.error("Imeshindwa kuidhinisha");
      Sentry.captureException(err);
    }
  });

  // Analytics
  const analyticsData = useMemo(() => {
    const speciesCount = allCatches.reduce((acc, c) => {
      acc[c.species] = (acc[c.species] || 0) + 1;
      return acc;
    }, {});

    const statusCount = allCatches.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});

    return {
      species: {
        labels: Object.keys(speciesCount),
        datasets: [{
          label: 'Aina za Samaki',
          data: Object.values(speciesCount),
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: '#10b981',
          borderWidth: 2,
        }]
      },
      status: {
        labels: ['Pending', 'Approved', 'Rejected'],
        datasets: [{
          label: 'Status',
          data: [
            statusCount.pending || 0,
            statusCount.approved || 0,
            statusCount.rejected || 0
          ],
          backgroundColor: ['#fbbf24', '#10b981', '#ef4444'],
        }]
      }
    };
  }, [allCatches]);

  const totalWeight = allCatches.reduce((sum, c) => sum + (Number(c.weight_kg) || 0), 0);
  const approvedCount = allCatches.filter(c => c.status === 'approved').length;
  const totalFishermen = new Set(allCatches.map(c => c.fisherman_name)).size;

  if (!user || user.role !== 'admin') return null;

  return (
    <DashboardContainer>
      <Sidebar isOpen={isSidebarOpen}>
        <motion.h2 whileHover={{ scale: 1.05 }} style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>
          FishKE Admin
        </motion.h2>
        
        <SidebarLink active>
          <FontAwesomeIcon icon={faHome} /> Overview
        </SidebarLink>
        <SidebarLink onClick={() => navigate('/admin/catch-logs')}>
          <FontAwesomeIcon icon={faFish} /> Rekodi za Samaki
        </SidebarLink>
        <SidebarLink onClick={() => navigate('/admin/users')}>
          <FontAwesomeIcon icon={faUsers} /> Wateja & Wavuvi
        </SidebarLink>
        
        <div style={{ marginTop: 'auto' }}>
          <SidebarLink onClick={() => logout().then(() => navigate('/login'))}>
            <FontAwesomeIcon icon={faSignOutAlt} /> Logout
          </SidebarLink>
        </div>
      </Sidebar>

      <MainContent>
        <Header>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <FontAwesomeIcon icon={faBars} style={{ fontSize: '1.8rem' }} />
          </button>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#0f172a' }}>
            Karibu Admin • {user.name}
          </h1>
        </Header>

        <StatsGrid>
          <StatCard>
            <FontAwesomeIcon icon={faFish} size="3x" color="#10b981" />
            <StatNumber>{pendingCatches.length}</StatNumber>
            <p>Pending Approval</p>
          </StatCard>
          <StatCard>
            <FontAwesomeIcon icon={faCheckCircle} size="3x" color="#10b981" />
            <StatNumber>{approvedCount}</StatNumber>
            <p>Approved Catches</p>
          </StatCard>
          <StatCard>
            <FontAwesomeIcon icon={faBoxOpen} size="3x" color="#10b981" />
            <StatNumber>{totalWeight.toFixed(0)}</StatNumber>
            <p>Total KG</p>
          </StatCard>
          <StatCard>
            <FontAwesomeIcon icon={faUsers} size="3x" color="#10b981" />
            <StatNumber>{totalFishermen}</StatNumber>
            <p>Active Fishermen</p>
          </StatCard>
        </StatsGrid>

                <Section>
          <h2>Batch Zinasubiri Idhini ({pendingCatches.length})</h2>
          {loadingPending ? (
            <p>Inapakia...</p>
          ) : pendingCatches.length === 0 ? (
            <p>Hakuna batch inayosubiri</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Mvuvi</Th>
                  <Th>Aina</Th>
                  <Th>Kilo</Th>
                  <Th>Tarehe</Th>
                  <Th>Status</Th>
                  <Th>Hatua</Th>
                </tr>
              </thead>
              <tbody>
                {pendingCatches.slice(0, 10).map(catchItem => (
                  <tr key={catchItem.catch_id}>
                    <Td>{catchItem.fisherman_name || 'Hajajulikana'}</Td>
                    <Td>{catchItem.species}</Td>
                    <Td><strong>{catchItem.weight || catchItem.weight_kg} kg</strong></Td>
                    <Td>{new Date(catchItem.harvest_date).toLocaleDateString('sw-KE')}</Td>
                    <Td>
                      <span style={{ color: '#f59e0b', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        Inasubiri
                      </span>
                    </Td>
                    <Td>
                      <ActionButton onClick={() => approveMutation.mutate(catchItem.catch_id)}>
                        <FontAwesomeIcon icon={faCheckCircle} /> Idhinisha
                      </ActionButton>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Section>

        <Section>
          <h2>Analytics za Taifa</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
            <div>
              <h3>Aina za Samaki</h3>
              <Bar data={analyticsData.species} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </div>
            <div>
              <h3>Hali ya Batch</h3>
              <Bar data={analyticsData.status} options={{ responsive: true }} />
            </div>
          </div>
        </Section>

        <Section>
          <h2>Ramani ya Taifa ya Uvuvi</h2>
          <div style={{ 
            height: '600px', 
            borderRadius: '20px', 
            overflow: 'hidden', 
            marginTop: '1.5rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            border: '5px solid #10b981'
          }}>
            <MapContainer 
              center={[-0.0236, 37.9062]} // Center on Kenya properly
              zoom={6.5} 
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; FishKE — Ramani ya Uvuvi wa Kenya'
              />

              {allCatches
                .filter(c => c.lat && c.lng && c.lat !== 0 && c.lng !== 0)
                .map(catchItem => (
                  <Marker
                    key={catchItem.catch_id} // CORRECT KEY — NO MORE WARNINGS
                    position={[parseFloat(catchItem.lat), parseFloat(catchItem.lng)]}
                  >
                    <Popup>
                      <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                          {catchItem.fisherman_name || 'Mvuvi'}
                        </strong>
                        <br />
                        <strong>Aina:</strong> {catchItem.species}<br />
                        <strong>Uzito:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                          {catchItem.weight || catchItem.weight_kg} kg
                        </span><br />
                        <strong>Tarehe:</strong> {new Date(catchItem.harvest_date).toLocaleDateString('sw-KE')}<br />
                        <strong>Status:</strong>{' '}
                        <span style={{ 
                          color: catchItem.status === 'approved' ? '#10b981' : '#f59e0b',
                          fontWeight: 'bold'
                        }}>
                          {catchItem.status === 'approved' ? 'IMEIDHINISHWA' : 'INASUBIRI'}
                        </span>

                        {catchItem.status === 'pending' && user?.role === 'admin' && (
                          <div style={{ marginTop: '12px' }}>
                            <ActionButton 
                              onClick={() => approveMutation.mutate(catchItem.catch_id)}
                              style={{ width: '100%', padding: '10px' }}
                            >
                              Idhinisha Hii
                            </ActionButton>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        </Section>
      </MainContent>
    </DashboardContainer>
  );
};

export default AdminDashboard;