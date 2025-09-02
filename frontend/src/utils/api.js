 // src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  // Fetch CSRF token for POST requests
  if (['post', 'put', 'delete'].includes(config.method)) {
    await axios.get('http://localhost:8000/sanctum/csrf-cookie', { withCredentials: true });
    const xsrfToken = decodeURIComponent(
      document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN'))?.split('=')[1] || ''
    );
      config.headers['X-XSRF-TOKEN'] = xsrfToken;
    }
    return config;
  });
  
  export default api;