import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api' || 'https://get-reech.onrender.com/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  if (['post', 'put', 'delete'].includes(config.method)) {
    await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/sanctum/csrf-cookie`, { withCredentials: true });
    const xsrfToken = decodeURIComponent(
      document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN'))?.split('=')[1] || ''
    );
    config.headers['X-XSRF-TOKEN'] = xsrfToken;
  }
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// =====================
// AUTHENTICATION
// =====================

export const login = async (phone, password) => {
  const { data } = await api.post('/login', { phone, password });
  return data;
};

export const register = async ({ name, phone, password, nationalId }) => {
  const { data } = await api.post('/register', {
    name,
    phone,
    password,
    national_id: nationalId,
  });
  return data;
};

export const logout = async () => {
  const { data } = await api.post('/logout');
  return data;
};

// =====================
// CATCH LOGS
// =====================

export const createCatch = async (catchData) => {
  const { data } = await api.post('/catch-logs', catchData);
  return data;
};

export const getCatches = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  const { data } = await api.get(`/catch-logs?user_id=${userId}`);
  return data;
};

// =====================
// MARKET LISTINGS
// =====================

export const createListing = async (listingData) => {
  const { data } = await api.post('/listings', listingData);
  return data;
};

export const getListings = async () => {
  const { data } = await api.get('/listings');
  return data;
};

// =====================
// IPFS
// =====================

export const uploadToIPFS = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/upload-ipfs', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data.url;
};

export { api };