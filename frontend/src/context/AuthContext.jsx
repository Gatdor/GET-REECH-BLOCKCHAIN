import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import * as Sentry from '@sentry/react';
import { get, set } from 'idb-keyval';

export const AuthContext = createContext();

const createLaravelApiInstance = () => {
  const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    withCredentials: true,
  });

  api.interceptors.request.use(
    async (config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (!(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
      }

      if (!config.url.includes('/sanctum/csrf-cookie')) {
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
            console.error('[Laravel API] CSRF token fetch error:', err.message, err.response?.data);
            Sentry.captureException(err, { extra: { action: 'fetch_csrf_token' } });
          }
        }

        if (xsrfToken) {
          config.headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfToken);
        }
      }

      console.debug('[Laravel API] Request headers:', config.headers);
      console.debug('[Laravel API] Request cookies:', document.cookie);
      return config;
    },
    (error) => {
      console.error('[Laravel API] Request interceptor error:', error.message);
      Sentry.captureException(error, { extra: { action: 'request_interceptor' } });
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 419) {
        console.warn('[Laravel API] CSRF token mismatch or session expired');
        localStorage.removeItem('auth_token');
      }
      if (error.response?.status === 500) {
        console.error('[Laravel API] Server error:', error.response?.data);
        Sentry.captureException(error, { extra: { action: 'server_error' } });
      }
      return Promise.reject(error);
    }
  );

  return api;
};

const createFabricApiInstance = () => {
  return axios.create({
    baseURL: 'http://peer0.org1.example.com:8000',
    withCredentials: false,
  });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const laravelApi = useMemo(createLaravelApiInstance, []);
  const fabricApi = useMemo(createFabricApiInstance, []);

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

  const initializeAuth = useCallback(async () => {
    if (!isOnline) {
      console.debug('[AuthContext] Offline, skipping auth initialization');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const hasSession = document.cookie.includes('laravel_session');
      if (!token || !hasSession) {
        console.debug('[AuthContext] No token or session, setting user to null');
        setUser(null);
        setLoading(false);
        return;
      }
      const response = await laravelApi.get('/user');
      console.debug('[AuthContext] User fetched:', response.data.user);
      setUser(response.data.user);
      setError(null);
    } catch (err) {
      console.error('[AuthContext] Fetch user error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      Sentry.captureException(err, { extra: { action: 'initialize_auth' } });
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.debug('[AuthContext] Unauthorized, clearing token');
        localStorage.removeItem('auth_token');
        setUser(null);
        setError(err.response?.data?.message || 'Authentication failed');
      } else {
        setError('Temporary server error. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline, laravelApi]);

  useEffect(() => {
    const timeout = setTimeout(initializeAuth, 500);
    return () => clearTimeout(timeout);
  }, [initializeAuth]);

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
      console.debug('[AuthContext] Fetching CSRF token for login:', email);
      await laravelApi.get('/sanctum/csrf-cookie').catch((err) => {
        const errorMessage = 'Failed to fetch CSRF token. Please check your server connection.';
        console.error('[AuthContext] CSRF fetch error:', err.message, err.response?.data);
        Sentry.captureException(err, { extra: { action: 'fetch_csrf_token', email, role } });
        throw new Error(errorMessage);
      });
      console.debug('[AuthContext] CSRF token fetched, sending login request');
      const response = await laravelApi.post('/login', { email, password, role });
      const { user, token } = response.data;
      localStorage.setItem('auth_token', token);
      setUser(user);
      setError(null);
      console.debug('[AuthContext] Login successful:', user);
      return { user, error: null };
    } catch (err) {
      const errorMessage =
        err.response?.status === 422
          ? Object.values(err.response?.data?.errors || {}).flat().join(', ') ||
            err.response?.data?.message ||
            'Invalid credentials'
          : err.response?.status === 419
          ? 'Session expired. Please refresh and try again.'
          : err.message === 'Failed to fetch CSRF token. Please check your server connection.'
          ? err.message
          : err.message || 'Login failed due to a server error';
      console.error('[AuthContext] Login error:', errorMessage, err.response?.data);
      Sentry.captureException(err, { extra: { action: 'login', email, role, response: err.response?.data } });
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
      await laravelApi.get('/sanctum/csrf-cookie');
      const response = await laravelApi.post('/register', { name, email, password, role, national_id });
      const { user, token } = response.data;
      localStorage.setItem('auth_token', token);
      setUser(user);
      setError(null);
      console.debug('[AuthContext] Registration successful:', user);

      if (role === 'fisherman') {
        try {
          await fabricApi.post('/register-fisher', {
            fisherId: String(user.id),
            name,
            govtId: national_id,
          });
          console.debug('[AuthContext] Fisher registered in Fabric:', user.id);
        } catch (fabricErr) {
          console.error('[AuthContext] Fabric register fisher error:', fabricErr.message, fabricErr.response?.data);
          Sentry.captureException(fabricErr, { extra: { action: 'register_fisher_fabric', userId: user.id } });
        }
      }

      return { user, error: null };
    } catch (err) {
      const errorMessage =
        err.response?.status === 422
          ? Object.values(err.response?.data?.errors || {}).flat().join(', ') ||
            err.response?.data?.message ||
            'Registration failed'
          : err.response?.status === 419
          ? 'Session expired. Please refresh and try again.'
          : err.response?.data?.message || 'Registration failed';
      console.error('[AuthContext] Register error:', errorMessage, err.response?.data);
      Sentry.captureException(err, { extra: { action: 'register', email, role } });
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!isOnline) {
      console.debug('[AuthContext] Offline, clearing local auth state');
      localStorage.removeItem('auth_token');
      setUser(null);
      setError(null);
      document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
      document.cookie = 'laravel_session=; Max-Age=0; path=/';
      return;
    }

    try {
      setLoading(true);
      await laravelApi.get('/sanctum/csrf-cookie');
      await laravelApi.post('/logout');
      console.debug('[AuthContext] Logout successful');
    } catch (err) {
      console.error('[AuthContext] Logout error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      Sentry.captureException(err, { extra: { action: 'logout' } });
      setError(err.response?.data?.message || 'Logout failed. Cleared local session.');
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      setLoading(false);
      document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
      document.cookie = 'laravel_session=; Max-Age=0; path=/';
    }
  };
  async function createCatch(catchData) {
    if (!user?.id) {
      const errorMessage = 'User must be logged in to create a catch';
      console.error('[AuthContext] Create catch error:', errorMessage);
      Sentry.captureException(new Error(errorMessage), { extra: { action: 'create_catch' } });
      throw new Error(errorMessage);
    }

    try {
      if (isOnline) {
        await laravelApi.get('/sanctum/csrf-cookie');
        const response = await laravelApi.post('/catch-logs', {
          catch_id: catchData.catch_id,
          user_id: String(user.id),
          species: catchData.species,
          dryingMethod: catchData.dryingMethod,
          batchSize: Number(catchData.batchSize),
          weight: Number(catchData.weight),
          harvest_date: catchData.harvest_date || new Date().toISOString().split('T')[0],
          lat: Number(catchData.lat),
          lng: Number(catchData.lng),
          shelf_life: catchData.shelf_life ? Number(catchData.shelf_life) : null,
          price: catchData.price ? Number(catchData.price) : null,
          image_urls: catchData.image_urls || null,
          quality_score: catchData.quality_score ? Number(catchData.quality_score) : null,
          status: catchData.status || null,
        });
        console.debug('[AuthContext] Catch created in Laravel:', response.data);

        try {
          await fabricApi.post('/submit-catch', {
            catchId: catchData.catch_id,
            fisherId: String(user.id),
            species: catchData.species,
            weight: Number(catchData.weight),
            date: catchData.harvest_date || new Date().toISOString().split('T')[0],
          });
          console.debug('[AuthContext] Catch submitted to Fabric:', catchData.catch_id);
        } catch (fabricErr) {
          console.error('[AuthContext] Fabric create catch error:', fabricErr.message, fabricErr.response?.data);
          Sentry.captureException(fabricErr, { extra: { action: 'submit_catch_fabric', catchData } });
        }

        return response.data;
      } else {
        const offlineActions = (await get('offlineActions')) || [];
        offlineActions.push({
          type: 'create_catch',
          data: {
            catch_id: catchData.catch_id,
            user_id: String(user.id),
            species: catchData.species,
            dryingMethod: catchData.dryingMethod,
            batchSize: Number(catchData.batchSize),
            weight: Number(catchData.weight),
            harvest_date: catchData.harvest_date || new Date().toISOString().split('T')[0],
            lat: Number(catchData.lat),
            lng: Number(catchData.lng),
            shelf_life: catchData.shelf_life ? Number(catchData.shelf_life) : null,
            price: catchData.price ? Number(catchData.price) : null,
            image_urls: catchData.image_urls || null,
            quality_score: catchData.quality_score ? Number(catchData.quality_score) : null,
            status: catchData.status || null,
          },
        });
        await set('offlineActions', offlineActions);
        console.debug('[AuthContext] Catch stored offline:', catchData);
        return { message: 'Catch stored offline, will sync when online' };
      }
    } catch (err) {
      const errorMessage = err.response?.status === 422
        ? Object.values(err.response?.data?.errors || {}).flat().join(', ') ||
        err.response?.data?.message ||
        'Failed to create catch'
        : err.response?.data?.message || 'Failed to create catch';
      console.error('[AuthContext] Create catch error:', errorMessage, err.response?.data);
      Sentry.captureException(err, { extra: { action: 'create_catch', catchData } });
      throw new Error(errorMessage);
    }
  }

  const getCatches = async ({ status } = {}) => {
    if (!user?.id) {
      const errorMessage = 'User must be logged in to fetch catches';
      console.error('[AuthContext] Get catches error:', errorMessage);
      Sentry.captureException(new Error(errorMessage), { extra: { action: 'get_catches' } });
      throw new Error(errorMessage);
    }

    try {
      const response = await laravelApi.get('/catch-logs', {
        params: { user_id: String(user.id), status },
      });
      console.debug('[AuthContext] Catches fetched from Laravel:', response.data);
      return response.data.data || [];
    } catch (err) {
      const errorMessage =
        err.response?.status === 422
          ? Object.values(err.response?.data?.errors || {}).flat().join(', ') ||
            err.response?.data?.message ||
            'Failed to fetch catches'
          : err.response?.data?.message || 'Failed to fetch catches';
      console.error('[AuthContext] Get catches error:', errorMessage, err.response?.data);
      Sentry.captureException(err, { extra: { action: 'get_catches', user_id: user.id, status } });
      throw new Error(errorMessage);
    }
  };

  const getCatchById = async (id) => {
    if (!id) {
      const errorMessage = 'Catch ID is required';
      console.error('[AuthContext] Get catch by ID error:', errorMessage);
      Sentry.captureException(new Error(errorMessage), { extra: { action: 'get_catch_by_id' } });
      throw new Error(errorMessage);
    }

    try {
      const response = await laravelApi.get(`/catch-logs/${id}`);
      console.debug('[AuthContext] Catch fetched:', response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch catch';
      console.error('[AuthContext] Get catch by ID error:', errorMessage, err.response?.data);
      Sentry.captureException(err, { extra: { action: 'get_catch_by_id', id } });
      throw new Error(errorMessage);
    }
  };

  const approveCatch = async (id) => {
    if (!id) {
      const errorMessage = 'Catch ID is required';
      console.error('[AuthContext] Approve catch error:', errorMessage);
      Sentry.captureException(new Error(errorMessage), { extra: { action: 'approve_catch' } });
      throw new Error(errorMessage);
    }

    try {
      await laravelApi.get('/sanctum/csrf-cookie');
      const response = await laravelApi.post(`/catch-logs/${id}/approve`);
      console.debug('[AuthContext] Catch approved:', response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to approve catch';
      console.error('[AuthContext] Approve catch error:', errorMessage, err.response?.data);
      Sentry.captureException(err, { extra: { action: 'approve_catch', id } });
      throw new Error(errorMessage);
    }
  };

  const getUsers = async () => {
    try {
      const response = await laravelApi.get('/users');
      console.debug('[AuthContext] Users fetched:', response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch users';
      console.error('[AuthContext] Get users error:', errorMessage, err.response?.data);
      Sentry.captureException(err, { extra: { action: 'get_users' } });
      throw new Error(errorMessage);
    }
  };

  const deleteUser = async (id) => {
    if (!id) {
      const errorMessage = 'User ID is required';
      console.error('[AuthContext] Delete user error:', errorMessage);
      Sentry.captureException(new Error(errorMessage), { extra: { action: 'delete_user' } });
      throw new Error(errorMessage);
    }

    try {
      await laravelApi.get('/sanctum/csrf-cookie');
      const response = await laravelApi.delete(`/users/${id}`);
      console.debug('[AuthContext] User deleted:', response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete user';
      console.error('[AuthContext] Delete user error:', errorMessage, err.response?.data);
      Sentry.captureException(err, { extra: { action: 'delete_user', id } });
      throw new Error(errorMessage);
    }
  };

  const createBatch = async (batchData) => {
    if (!user?.id) {
      const errorMessage = 'User must be logged in to create a batch';
      console.error('[AuthContext] Create batch error:', errorMessage);
      Sentry.captureException(new Error(errorMessage), { extra: { action: 'create_batch' } });
      throw new Error(errorMessage);
    }

    try {
      if (isOnline) {
        await laravelApi.get('/sanctum/csrf-cookie');
        const response = await laravelApi.post('/batches', { ...batchData, user_id: String(user.id) });
        console.debug('[AuthContext] Batch created in Laravel:', response.data);

        try {
          await fabricApi.post('/create-batch', {
            batchId: batchData.batch_id,
            catchIds: batchData.catch_ids,
            processorId: String(user.id),
            date: batchData.batch_date,
          });
          console.debug('[AuthContext] Batch created in Fabric:', batchData.batch_id);
        } catch (fabricErr) {
          console.error('[AuthContext] Fabric create batch error:', fabricErr.message, fabricErr.response?.data);
          Sentry.captureException(fabricErr, { extra: { action: 'create_batch_fabric', batchData } });
        }

        return response.data;
      } else {
        const offlineActions = (await get('offlineActions')) || [];
        offlineActions.push({ type: 'create_batch', data: { ...batchData, user_id: String(user.id) } });
        await set('offlineActions', offlineActions);
        console.debug('[AuthContext] Batch stored offline:', batchData);
        return { message: 'Batch stored offline, will sync when online' };
      }
    } catch (err) {
      const errorMessage =
        err.response?.status === 422
          ? Object.values(err.response?.data?.errors || {}).flat().join(', ') ||
            err.response?.data?.message ||
            'Failed to create batch'
          : err.response?.data?.message || 'Failed to create batch';
      console.error('[AuthContext] Create batch error:', errorMessage, err.response?.data);
      Sentry.captureException(err, { extra: { action: 'create_batch', batchData } });
      throw new Error(errorMessage);
    }
  };

  const getDashboard = async () => {
    if (!user?.id) {
      const errorMessage = 'User must be logged in to fetch dashboard';
      console.error('[AuthContext] Get dashboard error:', errorMessage);
      Sentry.captureException(new Error(errorMessage), { extra: { action: 'get_dashboard' } });
      throw new Error(errorMessage);
    }

    try {
      const response = await laravelApi.get('/dashboard', {
        params: { user_id: String(user.id) },
      });
      console.debug('[AuthContext] Dashboard fetched:', response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch dashboard';
      console.error('[AuthContext] Get dashboard error:', errorMessage, err.response?.data);
      Sentry.captureException(err, { extra: { action: 'get_dashboard', user_id: user.id } });
      throw new Error(errorMessage);
    }
  };

  const syncOfflineActions = async () => {
    if (!isOnline) {
      console.debug('[AuthContext] Offline, cannot sync actions');
      return;
    }

    const offlineActions = (await get('offlineActions')) || [];
    if (!offlineActions.length) {
      console.debug('[AuthContext] No offline actions to sync');
      return;
    }

    for (const action of offlineActions) {
      try {
        if (action.type === 'create_catch') {
          await createCatch(action.data);
          console.debug('[AuthContext] Synced offline catch:', action.data);
        } else if (action.type === 'create_batch') {
          await createBatch(action.data);
          console.debug('[AuthContext] Synced offline batch:', action.data);
        }
      } catch (err) {
        console.error('[AuthContext] Sync offline action error:', err.message, action);
        Sentry.captureException(err, { extra: { action: 'sync_offline', actionData: action } });
      }
    }

    await set('offlineActions', []);
    console.debug('[AuthContext] Offline actions cleared after sync');
  };

  useEffect(() => {
    if (isOnline) {
      syncOfflineActions();
    }
  }, [isOnline]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        setLoading,
        error,
        setError,
        isOnline,
        login,
        register,
        logout,
        createCatch,
        getCatches,
        getCatchById,
        approveCatch,
        getUsers,
        deleteUser,
        createBatch,
        getDashboard,
        laravelApi,
        fabricApi,
        syncOfflineActions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};