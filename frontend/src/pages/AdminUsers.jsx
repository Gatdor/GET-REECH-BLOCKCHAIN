// src/pages/AdminUsers.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers, faFish, faHome, faSignOutAlt, faBars,
  faSearch, faEdit, faTrash, faShieldAlt
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../utils/api';
import * as Sentry from '@sentry/react';
import axios from 'axios';

// SAME DESIGN AS ADMIN DASHBOARD
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
  font-weight: 600;
`;

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
`;

const ActionButton = styled(motion.button)`
  padding: 0.7rem 1.4rem;
  border: none;
  border-radius: 12px;
  margin: 0 0.25rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  background: ${({ danger }) => danger ? '#ef4444' : '#10b981'};
  color: white;
  &:hover { opacity: 0.9; }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 1.2rem 1.6rem;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  font-size: 1.1rem;
  margin-bottom: 2rem;
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
  }
`;

const Avatar = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #e2e8f0;
  background-image: url(${props => props.src});
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
`;

const RoleBadge = styled.span`
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-weight: bold;
  font-size: 0.9rem;
  background: ${props => props.isAdmin ? '#fee2e2' : '#ecfdf5'};
  color: ${props => props.isAdmin ? '#dc2626' : '#10b981'};
`;

const AdminUsers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  if (!user || user.role !== 'admin') {
    navigate('/');
    return;
  }

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // 1. Hakikisha CSRF cookie iko (hii ni muhimu kwa Sanctum)
      await axios.get('http://localhost:8000/sanctum/csrf-cookie', {
        withCredentials: true
      });

      // 2. Piga API kwa kutumia instance yako ya api (inayo withCredentials: true)
      const response = await api.get('/users');

      // 3. Handle response data kwa usalama
      let data = response?.data || [];

      if (data.users && Array.isArray(data.users)) data = data.users;
      else if (data.data && Array.isArray(data.data)) data = data.data;
      else if (!Array.isArray(data)) data = [];

      setUsers(data);
      toast.success(`Wateja ${data.length} wamepakiawa kikamilifu!`);

    } catch (err) {
      console.error('Failed to fetch users:', err);
      
      if (err.response?.status === 401) {
        toast.error("Session imepotea. Tafadhali ingia tena.");
        logout();
        navigate('/login');
      } else {
        toast.error("Imeshindwa kupakia wateja — jaribu tena");
      }
      
      Sentry.captureException(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  fetchUsers();
}, [user, navigate, logout]);

  const filteredUsers = Array.isArray(users)
    ? users.filter(u => {
        const query = search.toLowerCase();
        return (
          (u.name?.toLowerCase() || '').includes(query) ||
          (u.email?.toLowerCase() || '').includes(query) ||
          (u.national_id || '').includes(query) ||
          (u.phone || '').includes(query)
        );
      })
    : [];

  const handleDelete = async (id) => {
    if (!window.confirm("Una uhakika unataka kufuta mteja huyu?")) return;

    try {
      await axios.delete(`http://localhost:8000/api/users/${id}`, { withCredentials: true });
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success("Mteja amefutwa kikamilifu");
    } catch (err) {
      toast.error("Imeshindwa kufuta mteja");
      Sentry.captureException(err);
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <DashboardContainer>
      <Sidebar isOpen={isSidebarOpen}>
        <motion.h2 whileHover={{ scale: 1.05 }} style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>
          FishKE Admin
        </motion.h2>

        <SidebarLink onClick={() => navigate('/admin')}>
          <FontAwesomeIcon icon={faHome} /> Overview
        </SidebarLink>
        <SidebarLink onClick={() => navigate('/admin/catch-logs')}>
          <FontAwesomeIcon icon={faFish} /> Rekodi za Samaki
        </SidebarLink>
        <SidebarLink active>
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
            Wateja na Wavuvi • {user.name}
          </h1>
        </Header>

        <Section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <FontAwesomeIcon icon={faUsers} size="2x" color="#10b981" />
            <h2 style={{ fontSize: '2rem', fontWeight: '900', margin: 0 }}>
              Orodha ya Wateja ({filteredUsers.length})
            </h2>
          </div>

          <SearchInput
            type="text"
            placeholder="Tafuta jina, email, simu au National ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <FontAwesomeIcon icon={faUsers} size="4x" spin color="#10b981" />
              <p style={{ marginTop: '1rem', fontSize: '1.2rem' }}>Inapakia wateja...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '6rem', color: '#64748b' }}>
              <FontAwesomeIcon icon={faUsers} size="5x" color="#cbd5e1" />
              <h3 style={{ margin: '2rem 0' }}>Hakuna wateja bado</h3>
              <p>Wavuvi na wateja wataanza kujiunga hivi karibuni!</p>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Mvuvi / Mteja</Th>
                  <Th>Email</Th>
                  <Th>Simu / ID</Th>
                  <Th>Nafasi</Th>
                  <Th>Alijiunga</Th>
                  <Th>Hatua</Th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Avatar src={u.avatar} />
                        <strong>{u.name || 'Hajajulikana'}</strong>
                      </div>
                    </Td>
                    <Td>{u.email || '—'}</Td>
                    <Td>{u.national_id || u.phone || '—'}</Td>
                    <Td>
                      <RoleBadge isAdmin={u.role === 'admin'}>
                        {u.role === 'admin' ? 'ADMIN' : u.role === 'fisherman' ? 'MVUVI' : 'MTEJA'}
                      </RoleBadge>
                    </Td>
                    <Td>
                      {u.created_at 
                        ? new Date(u.created_at).toLocaleDateString('sw-KE')
                        : '—'
                      }
                    </Td>
                    <Td>
                      {u.role !== 'admin' ? (
                        <>
                          <ActionButton whileHover={{ scale: 1.05 }}>
                            <FontAwesomeIcon icon={faEdit} /> Hariri
                          </ActionButton>
                          <ActionButton 
                            danger 
                            whileHover={{ scale: 1.05 }}
                            onClick={() => handleDelete(u.id)}
                          >
                            <FontAwesomeIcon icon={faTrash} /> Futa
                          </ActionButton>
                        </>
                      ) : (
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                          <FontAwesomeIcon icon={faShieldAlt} /> Msimamizi
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Section>
      </MainContent>
    </DashboardContainer>
  );
};

export default AdminUsers;