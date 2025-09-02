import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as Sentry from '@sentry/react';

// Axios instance configuration
const createApiInstance = () => {
  const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    withCredentials: true,
  });

  // Request interceptor for CSRF token and auth
  api.interceptors.request.use(
    async (config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Skip Content-Type for FormData to let browser set multipart/form-data
      if (!(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
      }

      if (config.url.includes('/sanctum/csrf-cookie')) {
        return config;
      }

      let xsrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];

      if (!xsrfToken) {
        try {
          await api.get('/sanctum/csrf-cookie');
          xsrfToken = document.cookie
            .split('; ')
            .find((row) => row.startsWith('XSRF-TOKEN='))
            ?.split('=')[1];
        } catch (err) {
          console.error('[Axios] CSRF token fetch error:', err.message);
          Sentry.captureException(err);
        }
      }

      if (xsrfToken) {
        config.headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfToken);
      }

      console.log('[Axios] Request headers:', config.headers);
      console.log('[Axios] Request cookies:', document.cookie);
      return config;
    },
    (error) => {
      console.error('[Axios] Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 419) {
        console.warn('[Axios] CSRF token mismatch or session expired');
        localStorage.removeItem('auth_token');
      }
      if (error.response?.status === 500) {
        console.error('[Axios] Server error:', error.response?.data);
        Sentry.captureException(error);
      }
      return Promise.reject(error);
    }
  );

  return api;
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Initialize api instance
  const api = createApiInstance();

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize authentication
  const initializeAuth = useCallback(async () => {
    if (!isOnline) {
      console.log('[AuthContext] Offline, skipping auth initialization');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const hasSession = document.cookie.includes('laravel_session');
      if (!token || !hasSession) {
        console.log('[AuthContext] No token or session, setting user to null');
        setUser(null);
        setLoading(false);
        return;
      }
      const response = await api.get('/user');
      console.log('[AuthContext] User fetched:', response.data.user);
      setUser(response.data.user);
      setError(null);
    } catch (err) {
      console.error('[AuthContext] Fetch user error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      Sentry.captureException(err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('[AuthContext] Unauthorized, clearing token');
        localStorage.removeItem('auth_token');
        setUser(null);
        setError(err.response?.data?.message || 'Authentication failed');
      } else {
        setError('Temporary server error. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    const timeout = setTimeout(initializeAuth, 500);
    return () => clearTimeout(timeout);
  }, [initializeAuth]);

  // Login function
  const login = async (email, password, role) => {
    if (!isOnline) {
      const errorMessage = 'You are offline. Please connect to the internet to log in.';
      console.error('[AuthContext] Login error:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    if (!email || !password || !role) {
      const errorMessage = 'Email, password, and role are required';
      console.error('[AuthContext] Login error:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      setLoading(true);
      await api.get('/sanctum/csrf-cookie');
      const response = await api.post('/login', { email, password, role });
      const { user, token } = response.data;
      localStorage.setItem('auth_token', token);
      setUser(user);
      setError(null);
      console.log('[AuthContext] Login successful:', user);
      return { user, error: null };
    } catch (err) {
      const errorMessage =
        err.response?.status === 419
          ? 'Session expired. Please refresh and try again.'
          : err.response?.data?.message || 'Login failed';
      console.error('[AuthContext] Login error:', errorMessage);
      Sentry.captureException(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (name, email, password, role, national_id) => {
    if (!isOnline) {
      const errorMessage = 'You are offline. Please connect to the internet to register.';
      console.error('[AuthContext] Register error:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    if (!name || !email || !password || !role || !national_id) {
      const errorMessage = 'All fields are required';
      console.error('[AuthContext] Register error:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      setLoading(true);
      await api.get('/sanctum/csrf-cookie');
      const response = await api.post('/register', { name, email, password, role, national_id });
      const { user, token } = response.data;
      localStorage.setItem('auth_token', token);
      setUser(user);
      setError(null);
      console.log('[AuthContext] Registration successful:', user);
      return { user, error: null };
    } catch (err) {
      const errorMessage =
        err.response?.status === 419
          ? 'Session expired. Please refresh and try again.'
          : err.response?.data?.message || 'Registration failed';
      console.error('[AuthContext] Register error:', errorMessage);
      Sentry.captureException(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    if (!isOnline) {
      console.log('[AuthContext] Offline, clearing local auth state');
      localStorage.removeItem('auth_token');
      setUser(null);
      setError(null);
      document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
      document.cookie = 'laravel_session=; Max-Age=0; path=/';
      return;
    }

    try {
      setLoading(true);
      await api.get('/sanctum/csrf-cookie');
      await api.post('/logout');
      console.log('[AuthContext] Logout successful');
    } catch (err) {
      console.error('[AuthContext] Logout error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      Sentry.captureException(err);
      setError(err.response?.data?.message || 'Logout failed. Cleared local session.');
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      setLoading(false);
      document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
      document.cookie = 'laravel_session=; Max-Age=0; path=/';
    }
  };

  // Catch Log Functions
  const createCatch = async (catchData) => {
    if (!user?.id) {
      const errorMessage = 'User must be logged in to create a catch';
      console.error('[AuthContext] Create catch error:', errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const response = await api.post('/catch-logs', { ...catchData, user_id: user.id });
      console.log('[AuthContext] Catch created:', response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to create catch';
      console.error('[AuthContext] Create catch error:', errorMessage);
      Sentry.captureException(err);
      throw new Error(errorMessage);
    }
  };

  const getCatches = async () => {
    if (!user?.id) {
      const errorMessage = 'User must be logged in to fetch catches';
      console.error('[AuthContext] Get catches error:', errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const response = await api.get('/catch-logs', {
        params: { user_id: user.id },
      });
      console.log('[AuthContext] Catches fetched:', response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch catches';
      console.error('[AuthContext] Get catches error:', errorMessage);
      Sentry.captureException(err);
      throw new Error(errorMessage);
    }
  };

  const getCatchById = async (id) => {
    if (!id) {
      const errorMessage = 'Catch ID is required';
      console.error('[AuthContext] Get catch by ID error:', errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const response = await api.get(`/catch-logs/${id}`);
      console.log('[AuthContext] Catch fetched:', response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch catch';
      console.error('[AuthContext] Get catch by ID error:', errorMessage);
      Sentry.captureException(err);
      throw new Error(errorMessage);
    }
  };

  const approveCatch = async (id) => {
    if (!id) {
      const errorMessage = 'Catch ID is required';
      console.error('[AuthContext] Approve catch error:', errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const response = await api.post(`/catch-logs/${id}/approve`);
      console.log('[AuthContext] Catch approved:', response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to approve catch';
      console.error('[AuthContext] Approve catch error:', errorMessage);
      Sentry.captureException(err);
      throw new Error(errorMessage);
    }
  };

  // User Functions
  const getUsers = async () => {
    try {
      const response = await api.get('/users');
      console.log('[AuthContext] Users fetched:', response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch users';
      console.error('[AuthContext] Get users error:', errorMessage);
      Sentry.captureException(err);
      throw new Error(errorMessage);
    }
  };

  const deleteUser = async (id) => {
    if (!id) {
      const errorMessage = 'User ID is required';
      console.error('[AuthContext] Delete user error:', errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const response = await api.delete(`/users/${id}`);
      console.log('[AuthContext] User deleted:', response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete user';
      console.error('[AuthContext] Delete user error:', errorMessage);
      Sentry.captureException(err);
      throw new Error(errorMessage);
    }
  };

  // IPFS Functions
  const uploadToIPFS = async (file) => {
    if (!user?.id) {
      const errorMessage = 'You must be logged in to upload to IPFS';
      console.error('[AuthContext] Upload to IPFS error:', errorMessage);
      Sentry.captureException(new Error(errorMessage), {
        extra: { action: 'upload_to_ipfs' },
      });
      throw new Error(errorMessage);
    }

    if (!file) {
      const errorMessage = 'No file selected for upload';
      console.error('[AuthContext] Upload to IPFS error:', errorMessage);
      Sentry.captureException(new Error(errorMessage), {
        extra: { action: 'upload_to_ipfs' },
      });
      throw new Error(errorMessage);
    }

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      const errorMessage = 'Only JPEG or PNG images are allowed';
      console.error('[AuthContext] Upload to IPFS error:', errorMessage, {
        fileType: file.type,
        fileName: file.name,
        fileSize: file.size,
      });
      throw new Error(errorMessage);
    }

    if (file.size > 20 * 1024 * 1024) {
      const errorMessage = 'File size exceeds 20MB';
      console.error('[AuthContext] Upload to IPFS error:', errorMessage, {
        fileSize: file.size,
        fileName: file.name,
      });
      throw new Error(errorMessage);
    }

    const formData = new FormData();
    formData.append('file', file, file.name.replace(/[^a-zA-Z0-9.-]/g, '_')); // Sanitize file name

    console.log('[AuthContext] FormData contents:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    try {
      console.log('[AuthContext] Uploading to IPFS:', {
        name: file.name,
        type: file.type,
        size: file.size,
      });
      const response = await api.post('/upload-ipfs', formData);
      console.log('[AuthContext] IPFS upload successful:', response.data);
      return response.data.url;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to upload to IPFS';
      console.error('[AuthContext] Upload to IPFS error:', {
        message: errorMessage,
        status: err.response?.status,
        data: err.response?.data,
      });
      Sentry.captureException(err, {
        extra: {
          action: 'upload_to_ipfs',
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        },
      });
      throw new Error(errorMessage);
    }
  };

  // Create Batch Function
  const createBatch = async (batchData) => {
    if (!user?.id) {
      const errorMessage = 'User must be logged in to create a batch';
      console.error('[AuthContext] Create batch error:', errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const response = await api.post('/create-batch', { ...batchData, user_id: user.id });
      console.log('[AuthContext] Batch created:', response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to create batch';
      console.error('[AuthContext] Create batch error:', errorMessage);
      Sentry.captureException(err);
      throw new Error(errorMessage);
    }
  };

  // Dashboard Function
  const getDashboard = async () => {
    if (!user?.id) {
      const errorMessage = 'User must be logged in to fetch dashboard';
      console.error('[AuthContext] Get dashboard error:', errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const response = await api.get('/dashboard', {
        params: { user_id: user.id },
      });
      console.log('[AuthContext] Dashboard fetched:', response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch dashboard';
      console.error('[AuthContext] Get dashboard error:', errorMessage);
      Sentry.captureException(err);
      throw new Error(errorMessage);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isOnline,
        login,
        register,
        logout,
        setError,
        createCatch,
        getCatches,
        getCatchById,
        approveCatch,
        getUsers,
        deleteUser,
        uploadToIPFS,
        createBatch,
        getDashboard,
        api,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};