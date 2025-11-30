// src/components/Dashboard/FishermanDashboard.jsx
import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFish, faBox, faChartBar, faSignOutAlt, faBars, faCamera,
  faWifi, faTimesCircle, faCheckCircle, faCloudUploadAlt, faClock
} from '@fortawesome/free-solid-svg-icons';
import { DndProvider, useDrag } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { AuthContext } from '../../context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
    z-index: 2000;
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

const Input = styled.input`
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  font-size: 1rem;
  width: 100%;
  &:focus { border-color: #10b981; outline: none; }
`;

const Button = styled(motion.button)`
  background: #10b981;
  color: white;
  padding: 1rem 2rem;
  border: none;
  border-radius: 16px;
  font-weight: 600;
  cursor: pointer;
`;

// Draggable Catch Item
const DraggableCatch = ({ catchItem }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'catch',
    item: { catchItem },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <motion.div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        background: '#f0fdf4',
        padding: '1rem',
        borderRadius: '16px',
        margin: '0.5rem 0',
        cursor: 'move',
        border: '2px solid #86efac'
      }}
      whileHover={{ scale: 1.02 }}
    >
      <strong>{catchItem.species}</strong> • {catchItem.weight}kg
    </motion.div>
  );
};

const FishermanDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isOnline, logout, getCatches, createBatch } = useContext(AuthContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('view');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchCatches, setBatchCatches] = useState([]);

  const { data: catches = [], isLoading } = useQuery({
    queryKey: ['catches', user?.id],
    queryFn: () => getCatches(),
    enabled: !!user,
  });

  const totalCatches = catches.length;
  const totalWeight = catches.reduce((sum, c) => sum + Number(c.weight || 0), 0);
  const pendingCatches = catches.filter(c => c.status !== 'sold').length;

  const analyticsData = useMemo(() => {
    const speciesCount = catches.reduce((acc, c) => {
      acc[c.species] = (acc[c.species] || 0) + 1;
      return acc;
    }, {});
    return {
      labels: Object.keys(speciesCount),
      datasets: [{
        label: 'Catches by Species',
        data: Object.values(speciesCount),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: '#10b981',
        borderWidth: 2,
      }]
    };
  }, [catches]);

  const createBatchNow = async () => {
    if (batchCatches.length === 0) return toast.error("Add at least one catch");

    const payload = {
      batch_id: `BATCH_${Date.now()}`,
      catch_ids: batchCatches.map(c => c.catch_id),
      batch_date: new Date().toISOString().split('T')[0],
    };

    try {
      await createBatch(payload);
      toast.success("Batch created successfully!");
      setBatchCatches([]);
      setShowBatchModal(false);
      queryClient.invalidateQueries({ queryKey: ['catches'] });
    } catch (err) {
      toast.error("Failed to create batch");
    }
  };

  if (!user || user.role !== 'fisherman') {
    return <div style={{ textAlign: 'center', padding: '5rem', fontSize: '2rem', color: '#ef4444' }}>Access Denied</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <DashboardContainer>
        <ToastContainer position="bottom-center" theme="colored" />

        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen}>
          <motion.h2 whileHover={{ scale: 1.05 }} style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>
            FishKE • Mvuvi
          </motion.h2>
          <SidebarLink active={activeTab === 'view'} onClick={() => setActiveTab('view')}>
            <FontAwesomeIcon icon={faFish} /> View Catches
          </SidebarLink>
          <SidebarLink active={activeTab === 'log'} onClick={() => setActiveTab('log')}>
            <FontAwesomeIcon icon={faCamera} /> Log New Catch
          </SidebarLink>
          <SidebarLink onClick={() => setShowBatchModal(true)}>
            <FontAwesomeIcon icon={faBox} /> Create Batch
          </SidebarLink>
          <SidebarLink active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>
            <FontAwesomeIcon icon={faChartBar} /> Analytics
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
              Karibu {user.name} •{' '}
              <FontAwesomeIcon icon={isOnline ? faWifi : faTimesCircle} color={isOnline ? "#10b981" : "#ef4444"} />{' '}
              {isOnline ? 'Online' : 'Offline Mode'}
            </h1>
          </Header>

          <StatsGrid>
            <StatCard whileHover={{ scale: 1.05 }}>
              <FontAwesomeIcon icon={faFish} size="3x" color="#10b981" />
              <StatNumber>{totalCatches}</StatNumber>
              <p>Total Catches</p>
            </StatCard>
            <StatCard whileHover={{ scale: 1.05 }}>
              <FontAwesomeIcon icon={faBox} size="3x" color="#10b981" />
              <StatNumber>{totalWeight.toFixed(0)}</StatNumber>
              <p>Total KG</p>
            </StatCard>
            <StatCard whileHover={{ scale: 1.05 }}>
              <FontAwesomeIcon icon={faClock} size="3x" color="#f59e0b" />
              <StatNumber>{pendingCatches}</StatNumber>
              <p>Pending Sale</p>
            </StatCard>
            <StatCard whileHover={{ scale: 1.05 }}>
              <FontAwesomeIcon icon={faCloudUploadAlt} size="3x" color={isOnline ? "#10b981" : "#94a3b8"} />
              <StatNumber>{isOnline ? 'Live' : 'Saved'}</StatNumber>
              <p>Sync Status</p>
            </StatCard>
          </StatsGrid>

          {/* View Tab with Draggable Items */}
          {activeTab === 'view' && (
            <Section>
              <h2>Your Catches</h2>
              {isLoading ? <p>Loading...</p> : catches.length === 0 ? <p>No catches yet!</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#0f172a', color: 'white' }}>
                        <th style={{ padding: '1rem' }}>Drag</th>
                        <th style={{ padding: '1rem' }}>Species</th>
                        <th style={{ padding: '1rem' }}>Weight</th>
                        <th style={{ padding: '1rem' }}>Date</th>
                        <th style={{ padding: '1rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catches.map(c => (
                        <tr key={c.catch_id}>
                          <td style={{ padding: '1rem' }}><DraggableCatch catchItem={c} /></td>
                          <td style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>{c.species}</td>
                          <td style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}><strong>{c.weight}kg</strong></td>
                          <td style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>{new Date(c.harvest_date).toLocaleDateString('sw-KE')}</td>
                          <td style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                            <span style={{
                              padding: '0.5rem 1rem',
                              borderRadius: '20px',
                              background: c.status === 'sold' ? '#dcfce7' : '#fef3c7',
                              color: c.status === 'sold' ? '#166534' : '#92400e',
                              fontWeight: 'bold'
                            }}>
                              {c.status?.toUpperCase() || 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          )}

          {/* Other tabs */}
          {activeTab === 'log' && (
            <Section>
              <h2>Log New Catch</h2>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <Input placeholder="Species" />
                <Input type="number" placeholder="Weight (kg)" step="0.01" />
                <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                <Input type="number" placeholder="Price (KES)" />
                <Input type="file" multiple accept="image/*" />
                <Button whileTap={{ scale: 0.95 }}>Save Catch (Offline OK)</Button>
              </div>
            </Section>
          )}

          {activeTab === 'analytics' && (
            <Section>
              <h2>Catch Analytics</h2>
              <Bar data={analyticsData} options={{ responsive: true }} />
            </Section>
          )}
        </MainContent>

        {/* BATCH MODAL – useDrop is now INSIDE the modal */}
        {showBatchModal && (
          <BatchModal
            batchCatches={batchCatches}
            setBatchCatches={setBatchCatches}
            onClose={() => setShowBatchModal(false)}
            onCreate={createBatchNow}
          />
        )}
      </DashboardContainer>
    </DndProvider>
  );
};

// Separate modal component with useDrop inside
const BatchModal = ({ batchCatches, setBatchCatches, onClose, onCreate }) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'catch',
    drop: (item) => {
      if (!batchCatches.find(c => c.catch_id === item.catchItem.catch_id)) {
        setBatchCatches(prev => [...prev, item.catchItem]);
        toast.success(`Added ${item.catchItem.species}`);
      }
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <motion.div
        ref={drop}
        style={{
          background: 'white',
          padding: '3rem',
          borderRadius: '30px',
          width: '90%',
          maxWidth: '600px',
          minHeight: '500px',
          border: isOver ? '6px dashed #10b981' : '4px dashed #94a3b8'
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ textAlign: 'center', color: '#10b981', fontSize: '2rem' }}>Create New Batch</h2>
        <p style={{ textAlign: 'center', color: '#666' }}>Drag catches here</p>

        <div style={{ maxHeight: '400px', overflowY: 'auto', margin: '2rem 0' }}>
          {batchCatches.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: '1.5rem', color: '#999' }}>Drop catches here</p>
          ) : (
            batchCatches.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: '#f0fdf4', padding: '1rem', borderRadius: '16px', margin: '0.5rem 0' }}>
                <span><strong>{c.species}</strong> • {c.weight}kg</span>
                <button onClick={() => setBatchCatches(prev => prev.filter((_, idx) => idx !== i))} style={{ color: '#ef4444', background: 'none', border: 'none' }}>Remove</button>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Button onClick={onCreate} whileTap={{ scale: 0.95 }}>
            Create Batch ({batchCatches.length})
          </Button>
          <Button style={{ background: '#6b7280' }} onClick={() => { onClose(); setBatchCatches([]); }}>
            Cancel
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FishermanDashboard;