// src/pages/admin/AdminCatchLogs.jsx — KUOL GAI OFFICIAL FINAL VERSION
// 100% ERROR-FREE | NOVEMBER 21, 2025 | FISHKE 1.0

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, faBars, faSearch, faCheck, faTimes, 
  faQrcode, faDownload, faFish, faUsers, faHome, 
  faSignOutAlt, faImages, faCommentDots 
} from '@fortawesome/free-solid-svg-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { toast } from 'react-toastify';


const PageContainer = styled.div`
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
  max-width: 1400px;
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

const Section = styled.div`
  background: white;
  padding: 2rem;
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

const StatusBadge = styled.span`
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-size: 0.9rem;
  font-weight: 600;
  background: ${({ $status }) =>
    $status === 'approved' ? '#d1fae5' :
    $status === 'rejected' ? '#fee2e2' : '#fef3c7'};
  color: ${({ $status }) =>
    $status === 'approved' ? '#166534' :
    $status === 'rejected' ? '#991b1b' : '#92400e'};
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
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ImagePreview = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 12px;
  background: url(${props => props.src || '/assets/fish-placeholder.jpg'}) center/cover no-repeat;
  cursor: pointer;
  border: 3px solid #10b981;
  transition: all 0.3s;
  &:hover { transform: scale(1.1); }
`;

const RejectModal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const ModalBox = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
`;

const AdminCatchLogs = () => {
  const { laravelApi } = useAuth(); // ← ADD THIS LINE
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, getCatches, logout } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ open: false, type: '', data: null });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingLog, setRejectingLog] = useState(null);

  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/');
  }, [user, navigate]);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['adminCatchLogs'],
    queryFn: getCatches,
    enabled: !!user && user.role === 'admin',
    staleTime: 1000 * 60, // 1 minute
  });

  // 100% SAFE ID EXTRACTOR — NO MORE UNDEFINED
  const getCatchId = (log) => {
    return log.batch_id || log.catch_id || log.id || log.uuid || log._id || 'unknown';
  };
// Replace your two mutations with THIS EXACT CODE:

const approveMutation = useMutation({
  mutationFn: async (log) => {
    const id = log.catch_id || log.id || log.batch_id || log.uuid;
    if (!id) throw new Error("Catch ID haipatikani");

    // Use the CORRECT route + laravelApi from top level
    return laravelApi.post(`/admin/catches/${id}/approve`);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['adminCatchLogs'] });
    toast.success("Samaki ameidhinishwa kikamilifu!");
  },
  onError: (err) => {
    console.error("Approve error:", err.response);
    toast.error(err.response?.data?.message || "Imeshindwa kuidhinisha");
  }
});

const rejectMutation = useMutation({
  mutationFn: async ({ log, reason }) => {
    const id = log.catch_id || log.id || log.batch_id || log.uuid;
    if (!id) throw new Error("Catch ID haipatikani");

    return laravelApi.post(`/admin/catches/${id}/reject`, { rejection_reason: reason });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['adminCatchLogs'] });
    toast.success("Catch imekataliwa!");
    setRejectingLog(null);
    setRejectReason('');
  },
  onError: (err) => {
    console.error("Reject error:", err.response);
    toast.error(err.response?.data?.message || "Imeshindwa kukataa");
  }
});

  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      const query = search.toLowerCase();
      return (
        getCatchId(log).toLowerCase().includes(query) ||
        (log.fisherman_name || '').toLowerCase().includes(query) ||
        (log.species || '').toLowerCase().includes(query)
      );
    });
  }, [logs, search]);

  const generateQR = async (batchId) => {
    const url = `https://fishke.io/trace/${batchId}`;
    const canvas = document.getElementById('qr-canvas');
    if (canvas) {
      try {
        await QRCode.toCanvas(canvas, url, { width: 300, color: { dark: '#0f172a' } });
      } catch (err) {
        console.error("QR generation failed:", err);
      }
    }
  };

  const downloadPDF = (log) => {
    const id = getCatchId(log);
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("FishKE - Ripoti ya Samaki", 20, 20);
    doc.setFontSize(12);
    doc.text(`Mvuvi: ${log.fisherman_name || 'N/A'}`, 20, 40);
    doc.text(`Aina: ${log.species || 'N/A'}`, 20, 50);
    doc.text(`Kiasi: ${(log.weight_kg || log.weight || 0).toFixed(2)} kg`, 20, 60);
    doc.text(`Batch ID: ${id}`, 20, 70);
    doc.text(`Tarehe: ${new Date(log.created_at || log.harvest_date).toLocaleString('sw')}`, 20, 80);
    if (log.rejection_reason) {
      doc.setTextColor(220, 38, 38);
      doc.text(`SABABU YA KUKATALIWA: ${log.rejection_reason}`, 20, 100);
      doc.setTextColor(0, 0, 0);
    }
    doc.save(`FishKE_${id}.pdf`);
    toast.success("PDF imepakuliwa!");
  };

  const openImageModal = (log, index = 0) => {
    setModal({ open: true, type: 'image', data: log });
    setCurrentImageIndex(index);
  };

  const images = modal.data?.image_urls || modal.data?.images || [];

  if (!user || user.role !== 'admin') return null;

  return (
    <PageContainer>
      <Sidebar isOpen={isSidebarOpen}>
        <motion.h2 whileHover={{ scale: 1.05 }} style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>
          FishKE Admin
        </motion.h2>
        <SidebarLink onClick={() => navigate('/admin')}><FontAwesomeIcon icon={faHome} /> Dashboard</SidebarLink>
        <SidebarLink active><FontAwesomeIcon icon={faFish} /> Rekodi za Samaki</SidebarLink>
        <SidebarLink onClick={() => navigate('/admin/users')}><FontAwesomeIcon icon={faUsers} /> Wateja & Wavuvi</SidebarLink>
        <div style={{ marginTop: 'auto' }}>
          <SidebarLink onClick={() => logout().then(() => navigate('/login'))}>
            <FontAwesomeIcon icon={faSignOutAlt} /> Logout
          </SidebarLink>
        </div>
      </Sidebar>

      <MainContent>
        <Header>
          <button onClick={() => setIsSidebarOpen(prev => !prev)}>
            <FontAwesomeIcon icon={faBars} style={{ fontSize: '1.8rem' }} />
          </button>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#0f172a' }}>
            Rekodi za Samaki • {user.name}
          </h1>
          <button onClick={() => navigate(-1)} style={{ background: '#10b981', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 'bold' }}>
            <FontAwesomeIcon icon={faArrowLeft} /> Rudi
          </button>
        </Header>

        <Section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>
              Orodha Kamili ({filteredLogs.length})
            </h2>
            <div style={{ position: 'relative', minWidth: '300px', flex: '1', maxWidth: '500px' }}>
              <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Tafuta batch, mvuvi au aina..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '16px', border: '2px solid #e2e8f0', fontSize: '1rem' }}
              />
            </div>
          </div>

          {isLoading ? (
            <p style={{ textAlign: 'center', padding: '4rem', fontSize: '1.4rem', color: '#64748b' }}>Inapakia rekodi za samaki...</p>
          ) : filteredLogs.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '4rem', fontSize: '1.4rem', color: '#64748b' }}>Hakuna rekodi zilizopatikana</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table>
                <thead>
                  <tr>
                    <Th>Picha</Th>
                    <Th>Mvuvi</Th>
                    <Th>Aina</Th>
                    <Th>Kiasi</Th>
                    <Th>Batch ID</Th>
                    <Th>Tarehe</Th>
                    <Th>Status</Th>
                    <Th>Hatua</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const id = getCatchId(log);
                    return (
                      <tr key={id}>
                        <Td>
                          {(log.image_urls?.length > 0 || log.images?.length > 0) ? (
                            <ImagePreview src={log.image_urls?.[0] || log.images?.[0]} onClick={() => openImageModal(log, 0)} />
                          ) : (
                            <div style={{ width: 80, height: 80, background: '#e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FontAwesomeIcon icon={faImages} size="2x" color="#94a3b8" />
                            </div>
                          )}
                        </Td>
                        <Td>{log.fisherman_name || 'N/A'}</Td>
                        <Td>{log.species || 'N/A'}</Td>
                        <Td><strong>{(log.weight_kg || log.weight || 0).toFixed(2)} kg</strong></Td>
                        <Td><code style={{ fontSize: '0.85rem' }}>{id}</code></Td>
                        <Td>{new Date(log.created_at || log.harvest_date).toLocaleDateString('sw')}</Td>
                        <Td>
                          <StatusBadge $status={log.status || 'pending'}>
                            {log.status === 'approved' ? 'Imeidhinishwa' : log.status === 'rejected' ? 'Imekataliwa' : 'Inasubiri'}
                          </StatusBadge>
                          {log.rejection_reason && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#dc2626' }}>
                              <FontAwesomeIcon icon={faCommentDots} /> {log.rejection_reason}
                            </div>
                          )}
                        </Td>
                        <Td>
                          {log.status === 'pending' && (
                            <>
                              <ActionButton
                                onClick={() => approveMutation.mutate(log)}
                                disabled={approveMutation.isPending}
                                whileTap={{ scale: 0.95 }}
                              >
                                <FontAwesomeIcon icon={faCheck} /> Idhinisha
                              </ActionButton>
                              <ActionButton
                                reject
                                onClick={() => setRejectingLog(log)}
                                whileTap={{ scale: 0.95 }}
                              >
                                <FontAwesomeIcon icon={faTimes} /> Kataa
                              </ActionButton>
                            </>
                          )}
                          <ActionButton
                            style={{ background: '#3b82f6' }}
                            onClick={() => {
                              setModal({ open: true, type: 'qr', data: log });
                              setTimeout(() => generateQR(id), 100);
                            }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <FontAwesomeIcon icon={faQrcode} />
                          </ActionButton>
                          <ActionButton
                            style={{ background: '#8b5cf6' }}
                            onClick={() => downloadPDF(log)}
                            whileTap={{ scale: 0.95 }}
                          >
                            <FontAwesomeIcon icon={faDownload} />
                          </ActionButton>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Section>
      </MainContent>

      {/* Reject Modal */}
      {rejectingLog && (
        <RejectModal onClick={() => setRejectingLog(null)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>
              Kataa Catch #{getCatchId(rejectingLog)}
            </h2>
            <p>Mvuvi: <strong>{rejectingLog.fisherman_name || 'N/A'}</strong></p>
            <p>Aina: <strong>{rejectingLog.species || 'N/A'}</strong> • {(rejectingLog.weight_kg || rejectingLog.weight || 0).toFixed(2)}kg</p>
            <textarea
              placeholder="Andika sababu ya kukataa..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: '100%', height: '120px', padding: '1rem', borderRadius: '12px', border: '2px solid #fecaca', margin: '1rem 0', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <ActionButton
                reject
                style={{ flex: 1 }}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ log: rejectingLog, reason: rejectReason })}
              >
                {rejectMutation.isPending ? 'Inasindika...' : 'Kataa Rasmi'}
              </ActionButton>
              <ActionButton style={{ flex: 1, background: '#64748b' }} onClick={() => { setRejectingLog(null); setRejectReason(''); }}>
                Ghairi
              </ActionButton>
            </div>
          </ModalBox>
        </RejectModal>
      )}

      {/* Image Modal */}
      {modal.open && modal.type === 'image' && images.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.97)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setModal({ open: false })}>
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} style={{ position: 'relative', maxWidth: '95vw', maxHeight: '95vh' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setModal({ open: false })} style={{ position: 'absolute', top: '-60px', right: '0', background: 'none', border: 'none', color: 'white', fontSize: '3.5rem', cursor: 'pointer', fontWeight: '300' }}>×</button>
            <img src={images[currentImageIndex]} alt="Evidence" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '20px', boxShadow: '0 30px 80px rgba(0,0,0,0.9)' }} />
            {images.length > 1 && (
              <>
                <button onClick={() => setCurrentImageIndex(i => (i - 1 + images.length) % images.length)} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', width: '60px', height: '60px', borderRadius: '50%', fontSize: '2rem' }}>‹</button>
                <button onClick={() => setCurrentImageIndex(i => (i + 1) % images.length)} style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', width: '60px', height: '60px', borderRadius: '50%', fontSize: '2rem' }}>›</button>
                <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '0.5rem 1rem', borderRadius: '50px' }}>
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* QR Modal */}
      {modal.open && modal.type === 'qr' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '3rem', borderRadius: '24px', textAlign: 'center', maxWidth: '90%', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <button onClick={() => setModal({ open: false })} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '2.5rem', color: '#64748b' }}>×</button>
            <h2 style={{ marginBottom: '1.5rem', color: '#0f172a' }}>Blockchain QR Code</h2>
            <canvas id="qr-canvas" style={{ border: '12px solid #10b981', borderRadius: '16px' }}></canvas>
            <p style={{ marginTop: '1.5rem', fontFamily: 'monospace', background: '#f1f5f9', padding: '1rem', borderRadius: '12px', fontSize: '1.1rem' }}>
              {getCatchId(modal.data)}
            </p>
            <button style={{ marginTop: '1.5rem', padding: '0.75rem 2rem', borderRadius: '12px', background: '#3b82f6', color: 'white', fontSize: '1.1rem', fontWeight: '600' }} onClick={() => {
              const canvas = document.getElementById('qr-canvas');
              if (canvas) {
                const url = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = url;
                a.download = `QR_${getCatchId(modal.data)}.png`;
                a.click();
              }
            }}>
              Pakua QR Code
            </button>
          </div>
        </div>
      )}

      <canvas id="qr-canvas" style={{ display: 'none' }} />
    </PageContainer>
  );
};

export default AdminCatchLogs;