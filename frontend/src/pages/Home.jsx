import React, { useState, useEffect, useContext, useMemo, useCallback, Suspense, lazy } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faChevronLeft, faChevronRight, faInfoCircle, faSignOutAlt, faBell, faPaintRoller } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import Tilt from 'react-parallax-tilt';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title as ChartTitle, Tooltip as ChartTooltip, Legend } from 'chart.js';
import * as Sentry from '@sentry/react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { Helmet } from 'react-helmet-async';
import { StyleSheetManager } from 'styled-components';
import isPropValid from '@emotion/is-prop-valid';
import io from 'socket.io-client';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, ChartTooltip, Legend);

// Lazy-loaded components
const ThemePreviewModal = lazy(() => import('../components/ThemePreviewModal.jsx'));

// Theme Definitions
const themes = {
  light: {
    mode: 'light',
    background: '#F1F5F9',
    backgroundSecondary: '#E2E8F0',
    card: '#ffffff',
    text: '#1E3A8A',
    textSecondary: '#6B7280',
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    border: '#D1D5DB',
  },
  dark: {
    mode: 'dark',
    background: '#1F2937',
    backgroundSecondary: '#374151',
    card: '#4B5563',
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    primary: '#60A5FA',
    primaryHover: '#3B82F6',
    border: '#4B5563',
  },
  ocean: {
    mode: 'ocean',
    background: '#E0F7FA',
    backgroundSecondary: '#B2EBF2',
    card: '#E6F3FA',
    text: '#004D40',
    textSecondary: '#00695C',
    primary: '#00ACC1',
    primaryHover: '#00838F',
    border: '#80DEEA',
  },
  forest: {
    mode: 'forest',
    background: '#F1F8E9',
    backgroundSecondary: '#DCEDC8',
    card: '#F5F6F5',
    text: '#2E7D32',
    textSecondary: '#558B2F',
    primary: '#689F38',
    primaryHover: '#558B2F',
    border: '#AED581',
  },
};

// Common styles
const commonStyles = css`
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const clampFontSize = (min, vw, max) => `clamp(${min}rem, ${vw}vw, ${max}rem)`;

const GradientButton = css`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.primary || '#1E3A8A'} 0%,
    ${({ theme }) => theme.primaryHover || '#3B82F6'} 100%
  );
  color: white;
  border: none;
  padding: clamp(0.75rem, 1.5vw, 1rem) clamp(1.5rem, 2.5vw, 2rem);
  font-size: ${clampFontSize(0.9, 2, 1)};
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px;
  &:hover {
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.primaryHover || '#2563EB'} 0%,
      #1E3A8A 100%
    );
  }
  &:disabled {
    background: ${({ theme }) => theme.textSecondary || '#6B7280'};
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

// Styled Components
const MainContent = styled.div.withConfig({ shouldForwardProp: isPropValid })`
  padding: clamp(1rem, 3vw, 2rem);
  max-width: 1280px;
  margin: 1.5rem auto;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.background || '#F1F5F9'} 0%,
    ${({ theme }) => theme.backgroundSecondary || '#E2E8F0'} 100%
  );
  min-height: 100vh;
`;

const Header = styled.header.withConfig({ shouldForwardProp: isPropValid })`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(0.5rem, 2vw, 1rem);
  background: ${({ theme }) => theme.card || '#ffffff'};
  ${commonStyles}
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
`;

const PageTitle = styled(motion.h1).withConfig({ shouldForwardProp: isPropValid })`
  font-size: ${clampFontSize(1.5, 3, 2)};
  font-weight: 700;
  color: ${({ theme }) => theme.text || '#1E3A8A'};
`;

const ThemeSelector = styled.select.withConfig({ shouldForwardProp: isPropValid })`
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  background: ${({ theme }) => theme.card || '#ffffff'};
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  font-size: ${clampFontSize(0.9, 2, 1)};
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary || '#3B82F6'};
  }
`;

const IconButton = styled(motion.button).withConfig({ shouldForwardProp: isPropValid })`
  background: none;
  border: none;
  cursor: pointer;
  font-size: ${clampFontSize(1, 2, 1.2)};
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  position: relative;
`;

const NotificationBadge = styled.span.withConfig({ shouldForwardProp: isPropValid })`
  position: absolute;
  top: -5px;
  right: -5px;
  background: #EF4444;
  color: white;
  border-radius: 50%;
  padding: 2px 6px;
  font-size: 0.75rem;
`;

const HeroSection = styled(motion.section).withConfig({ shouldForwardProp: isPropValid })`
  position: relative;
  padding: clamp(2rem, 5vw, 4rem);
  text-align: center;
  background: ${({ theme }) => theme.card || '#ffffff'};
  ${commonStyles}
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
`;

const HeroOverlay = styled(motion.div).withConfig({ shouldForwardProp: isPropValid })`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.1));
`;

const HeroContent = styled.div.withConfig({ shouldForwardProp: isPropValid })`
  position: relative;
  z-index: 10;
`;

const HeroTitle = styled(motion.h2).withConfig({ shouldForwardProp: isPropValid })`
  font-size: ${clampFontSize(2, 5, 3)};
  font-weight: 700;
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  margin-bottom: 1rem;
`;

const HeroSubtitle = styled(motion.p).withConfig({ shouldForwardProp: isPropValid })`
  font-size: ${clampFontSize(1, 2, 1.2)};
  color: ${({ theme }) => theme.textSecondary || '#6B7280'};
  margin-bottom: 2rem;
`;

const Button = styled(motion.button).withConfig({ shouldForwardProp: isPropValid })`
  ${GradientButton}
`;

const CarouselSection = styled.section.withConfig({ shouldForwardProp: isPropValid })`
  padding: clamp(1rem, 3vw, 2rem);
  background: ${({ theme }) => theme.card || '#ffffff'};
  ${commonStyles}
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
`;

const CarouselWrapper = styled.div.withConfig({ shouldForwardProp: isPropValid })`
  overflow: hidden;
  max-width: 600px;
  margin: 0 auto;
`;

const CarouselItem = styled(motion.div).withConfig({ shouldForwardProp: isPropValid })`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const CarouselImage = styled(LazyLoadImage).withConfig({ shouldForwardProp: isPropValid })`
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  border-radius: 8px;
`;

const ListingTitle = styled(motion.h3).withConfig({ shouldForwardProp: isPropValid })`
  font-size: ${clampFontSize(1, 2, 1.2)};
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  margin: 0.5rem 0;
`;

const ListingDetail = styled(motion.p).withConfig({ shouldForwardProp: isPropValid })`
  font-size: ${clampFontSize(0.9, 2, 1)};
  color: ${({ theme }) => theme.textSecondary || '#6B7280'};
`;

const CarouselNav = styled(motion.button).withConfig({ shouldForwardProp: isPropValid })`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 50%;
  z-index: 10;
  ${({ direction }) => (direction === 'left' ? 'left: 10px;' : 'right: 10px;')}
`;

const StatsSection = styled.section.withConfig({ shouldForwardProp: isPropValid })`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
  padding: clamp(1rem, 3vw, 2rem);
  background: ${({ theme }) => theme.card || '#ffffff'};
  ${commonStyles}
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
`;

const AnalyticsSection = styled.section.withConfig({ shouldForwardProp: isPropValid })`
  padding: clamp(1rem, 3vw, 2rem);
  background: ${({ theme }) => theme.card || '#ffffff'};
  ${commonStyles}
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  margin-top: 1.5rem;
`;

const MapSection = styled.section.withConfig({ shouldForwardProp: isPropValid })`
  padding: clamp(1rem, 3vw, 2rem);
  height: 400px;
  background: ${({ theme }) => theme.card || '#ffffff'};
  ${commonStyles}
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
`;

const ListingsSection = styled.section.withConfig({ shouldForwardProp: isPropValid })`
  padding: clamp(1rem, 3vw, 2rem);
  background: ${({ theme }) => theme.card || '#ffffff'};
  ${commonStyles}
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
`;

const ErrorMessage = styled(motion.p).withConfig({ shouldForwardProp: isPropValid })`
  background: #fee2e2;
  color: #991b1b;
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  border-radius: 8px;
  text-align: center;
`;

const LoadingSpinner = styled(motion.div).withConfig({ shouldForwardProp: isPropValid })`
  border: 4px solid ${({ theme }) => theme.textSecondary || '#D1D5DB'};
  border-top: 4px solid ${({ theme }) => theme.primary || '#3B82F6'};
  border-radius: 50%;
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
  margin: 1rem auto;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div.withConfig({ shouldForwardProp: isPropValid })`
  text-align: center;
  padding: clamp(1rem, 3vw, 2rem);
`;

const NewsletterSection = styled.section.withConfig({ shouldForwardProp: isPropValid })`
  padding: clamp(1rem, 3vw, 2rem);
  text-align: center;
  background: ${({ theme }) => theme.card || '#ffffff'};
  ${commonStyles}
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
`;

const NewsletterForm = styled.form.withConfig({ shouldForwardProp: isPropValid })`
  display: flex;
  justify-content: center;
  gap: clamp(0.5rem, 2vw, 1rem);
  margin-top: 1rem;
  flex-wrap: wrap;
`;

const NewsletterInput = styled.input.withConfig({ shouldForwardProp: isPropValid })`
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  border-radius: 8px;
  font-size: ${clampFontSize(0.9, 2, 1)};
  width: clamp(200px, 50vw, 300px);
  background: ${({ theme }) => theme.card || '#ffffff'};
  transition: border-color 0.3s, box-shadow 0.3s;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary || '#3B82F6'};
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
  }
`;

const Footer = styled.footer.withConfig({ shouldForwardProp: isPropValid })`
  padding: clamp(1rem, 3vw, 2rem);
  text-align: center;
  background: ${({ theme }) => theme.card || '#ffffff'};
  ${commonStyles}
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
`;

// Constants
const customIcon = new L.Icon({
  iconUrl: '/assets/fallback-fish.jpg',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Animation Variants
const animationVariants = {
  page: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.5 } },
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.5 } },
  slide: { initial: { x: 100 }, animate: { x: 0 }, exit: { x: -100 }, transition: { duration: 0.3 } },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

// StatCard Component
const StatCard = ({ value, label, delay, format, tooltip }) => {
  const { theme } = useContext(ThemeContext);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      style={{
        padding: '1rem',
        background: theme.card,
        borderRadius: '8px',
        textAlign: 'center',
      }}
    >
      <motion.h3 style={{ fontSize: clampFontSize(1.2, 3, 1.5), color: theme.text }}>
        {format ? format(value) : value}
        <FontAwesomeIcon
          icon={faInfoCircle}
          data-tooltip-id={`stat-${label}`}
          data-tooltip-content={tooltip}
          style={{ cursor: 'pointer', color: theme.textSecondary, marginLeft: '0.5rem' }}
        />
        <Tooltip id={`stat-${label}`} />
      </motion.h3>
      <motion.p style={{ fontSize: clampFontSize(0.9, 2, 1), color: theme.textSecondary }}>
        {label}
      </motion.p>
    </motion.div>
  );
};

// ListingCard Component
const ListingCard = ({ listing, t }) => {
  const { theme } = useContext(ThemeContext);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        padding: '1rem',
        background: theme.card,
        borderRadius: '8px',
        marginBottom: '1rem',
      }}
    >
      <LazyLoadImage
        src={listing.image_urls?.[0] || '/assets/fallback-fish.jpg'}
        alt={t('HomeImageAlt', { species: listing.species })}
        effect="blur"
        style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }}
      />
      <motion.h3 style={{ fontSize: clampFontSize(1, 2, 1.2), color: theme.text }}>
        {t('HomeListingTitle', { species: listing.species, id: listing.catch_id })}
        <FontAwesomeIcon
          icon={faInfoCircle}
          data-tooltip-id={`listing-${listing.catch_id}`}
          data-tooltip-content={t('HomeTooltipsListing', { species: listing.species })}
          style={{ cursor: 'pointer', color: theme.textSecondary, marginLeft: '0.5rem' }}
        />
        <Tooltip id={`listing-${listing.catch_id}`} />
      </motion.h3>
      <motion.p style={{ fontSize: clampFontSize(0.9, 2, 1), color: theme.textSecondary }}>
        {t('HomeWeight', { weight: listing.weight })}
      </motion.p>
      <motion.p style={{ fontSize: clampFontSize(0.9, 2, 1), color: theme.textSecondary }}>
        {t('HomePrice', { price: listing.price || 'N/A' })}
      </motion.p>
    </motion.div>
  );
};

// AnalyticsChart Component
const AnalyticsChart = ({ data, t }) => {
  const chartData = useMemo(
    () => ({
      labels: data.map((item) => item.date),
      datasets: [
        {
          label: t('HomeCatchesTrend', 'Catch Trends'),
          data: data.map((item) => item.count),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: '#3B82F6',
          borderWidth: 1,
        },
      ],
    }),
    [data, t]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: t('HomeAnalyticsTitle', 'Catch Analytics') },
        tooltip: {
          callbacks: {
            label: (context) => `${t('HomeCatchesTrend')}: ${context.raw}`,
          },
        },
      },
      scales: {
        y: { beginAtZero: true },
      },
    }),
    [t]
  );

  return <Bar data={chartData} options={options} />;
};

// Validation for Listings
const validateListing = (listing) => {
  const errors = [];
  if (!listing?.species || typeof listing.species !== 'string' || listing.species.trim() === '') {
    errors.push('Invalid or missing species');
  }
  if (!listing?.weight || typeof listing.weight !== 'number' || listing.weight <= 0) {
    errors.push('Weight must be a positive number');
  }
  if (!listing?.catch_id || typeof listing.catch_id !== 'string') {
    errors.push('Invalid or missing catch_id');
  }
  if (!listing?.image_urls || !Array.isArray(listing.image_urls)) {
    listing.image_urls = ['/assets/fallback-fish.jpg'];
  }
  if (errors.length > 0) {
    Sentry.captureMessage('Invalid catch data', { extra: { listing, errors } });
  }
  return errors.length > 0 ? errors : null;
};

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isOnline, logout, loading: authLoading, api } = useAuth();
  const { theme, setTheme } = useContext(ThemeContext);
  const queryClient = useQueryClient();
  const [state, setState] = useState({
    carouselIndex: 0,
    email: '',
    error: '',
    notifications: [],
    showThemeModal: false,
  });

  const { carouselIndex, email, error, notifications, showThemeModal } = state;

  // WebSocket Setup
  useEffect(() => {
    if (!user || !isOnline) return;
    const socket = io('http://localhost:3000', {
      auth: { token: localStorage.getItem('auth_token') },
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Connected');
    });

    socket.on('newCatch', (data) => {
      setState((prev) => ({
        ...prev,
        notifications: [...prev.notifications, { id: Date.now(), message: t('HomeNewCatch', { species: data.species }) }],
      }));
      queryClient.invalidateQueries(['catch-logs']);
    });

    socket.on('connect_error', (err) => {
      console.error('[WebSocket] Connection error:', err.message);
      Sentry.captureException(err);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, isOnline, t, queryClient]);

  // Theme Switching
  const handleThemeChange = useCallback(
    (newTheme) => {
      setTheme(themes[newTheme]);
      localStorage.setItem('theme', newTheme);
      setState((prev) => ({ ...prev, showThemeModal: false }));
    },
    [setTheme]
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && themes[savedTheme]) {
      setTheme(themes[savedTheme]);
    }
  }, [setTheme]);

  // Timeout for API calls
  const timeout = useCallback(
    (promise, time) => {
      let timer;
      return Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(t('HomeErrorsTimeout', 'Request timed out. Please try again.'))), time);
        }),
      ]).finally(() => clearTimeout(timer));
    },
    [t]
  );

  // React Query for fetching listings
  const { data: listingsData, error: listingsError, isLoading: listingsLoading } = useQuery({
    queryKey: ['catch-logs', { status: 'approved', limit: 12, user_id: user?.id }],
    queryFn: async () => {
      if (!isOnline) throw new Error(t('HomeErrorsOffline', 'You are offline. Please connect to the internet.'));
      const url = user?.role === 'fisherman' ? `/catch-logs?status=approved&limit=12&user_id=${user.id}` : '/catch-logs?status=approved&limit=12';
      const response = await timeout(api.get(url), 30000);
      const data = response.data.data || response.data || [];
      return data.map((listing) => ({
        ...listing,
        catch_id: listing.catch_id || listing.id,
        image_urls: Array.isArray(listing.image_urls) ? listing.image_urls : ['/assets/fallback-fish.jpg'],
        weight: listing.weight || listing.quantity || 0,
        user_email: listing.user_email || 'N/A',
        price: listing.price || 'N/A',
        latitude: listing.lat || listing.latitude,
        longitude: listing.lng || listing.longitude,
      })).filter((listing) => !validateListing(listing));
    },
    enabled: !authLoading && isOnline,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: (err) => {
      console.error('[Home] Fetch catch-logs error:', err.message);
      Sentry.captureException(err);
      setState((prev) => ({ ...prev, error: err.message || t('HomeErrorsNetwork', 'Network error. Please try again.') }));
    },
  });

  // React Query for stats
  const { data: statsData, error: statsError, isLoading: statsLoading } = useQuery({
  queryKey: ['stats', user?.id],
  queryFn: async () => {
    if (!isOnline) throw new Error(t('HomeErrorsOffline', 'You are offline. Please connect to the internet.'));
    if (!user) throw new Error(t('HomeErrorsUnauthorized', 'You must be logged in to view stats.'));
    try {
      const [catchesResponse, usersResponse, valueResponse] = await Promise.all([
        timeout(api.get('/catch-logs/count'), 30000),
        timeout(user.role === 'admin' ? api.get('/users/count') : Promise.resolve({ data: { count: 0 } }), 30000),
        timeout(api.get('/catch-logs/total-value'), 30000),
      ]);
      return {
        catches: catchesResponse.data.count || 0,
        users: usersResponse.data.count || 0,
        value: valueResponse.data.total_value || valueResponse.data.total || 0,
      };
    } catch (error) {
      console.error('[Home] Stats request error:', error);
      throw error;
    }
  },
  enabled: !authLoading && isOnline && !!user,
  retry: 1,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  staleTime: 5 * 60 * 1000, // 5 minutes
  onError: (err) => {
    console.error('[Home] Fetch stats error:', err.message);
    Sentry.captureException(err);
    setState((prev) => ({ ...prev, error: err.message || t('HomeErrorsNetwork', 'Network error. Please try again.') }));
  },
});

  // React Query for analytics (admin only)
  const { data: analyticsData, error: analyticsError, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      if (!isOnline) throw new Error(t('HomeErrorsOffline', 'You are offline. Please connect to the internet.'));
      const response = await timeout(api.get('/catch-logs/trends'), 30000);
      return response.data || [
        { date: '2025-08-01', count: 10 },
        { date: '2025-08-02', count: 15 },
        { date: '2025-08-03', count: 12 },
      ];
    },
    enabled: !authLoading && isOnline && user?.role === 'admin',
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: (err) => {
      console.error('[Home] Fetch analytics error:', err.message);
      Sentry.captureException(err);
      setState((prev) => ({ ...prev, error: err.message || t('HomeErrorsAnalytics', 'Failed to load analytics.') }));
    },
  });

  // Real-time updates (polling fallback)
  useEffect(() => {
    if (!isOnline || authLoading) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries(['catch-logs', 'stats', 'analytics']);
    }, 60000);
    return () => clearInterval(interval);
  }, [isOnline, authLoading, queryClient]);

  // Carousel interval
  useEffect(() => {
    if (!listingsData || listingsData.length <= 1) return;
    const interval = setInterval(() => {
      setState((prev) => ({
        ...prev,
        carouselIndex: (prev.carouselIndex + 1) % listingsData.length,
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, [listingsData]);

  // Newsletter Signup
  const handleNewsletterSignup = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        if (!isOnline) throw new Error(t('HomeErrorsOffline', 'You are offline. Please connect to the internet.'));
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(t('HomeErrorsInvalidEmail', 'Please enter a valid email address'));
        await timeout(api.post('/newsletter', { email }), 30000);
        setState((prev) => ({ ...prev, email: '', error: t('HomeNewsletterSuccess', 'Successfully subscribed to the newsletter!') }));
        setTimeout(() => setState((prev) => ({ ...prev, error: '' })), 3000);
      } catch (error) {
        console.error('[Home] Newsletter signup error:', error.message);
        Sentry.captureException(error);
        const errorMessage =
          error.message === t('HomeErrorsTimeout') ? error.message : error.response?.data?.message || t('HomeNewsletterError', 'Failed to subscribe to newsletter.');
        setState((prev) => ({ ...prev, error: errorMessage }));
      }
    },
    [email, isOnline, t, api, timeout]
  );

  const featuredListings = useMemo(() => listingsData?.slice(0, 3) || [], [listingsData]);

  // Combine error messages
  const errorMessage = useMemo(
    () => [listingsError?.message, statsError?.message, analyticsError?.message, error].filter(Boolean).join('; '),
    [listingsError, statsError, analyticsError, error]
  );

  // Role-based dashboard
  const getDashboardContent = useCallback(() => {
    if (!user) return null;
    switch (user.role) {
      case 'admin':
        return (
          <AnalyticsSection>
            <motion.h2 style={{ fontSize: clampFontSize(1.2, 3, 1.5), marginBottom: '1rem', color: theme.text }}>
              {t('HomeAnalyticsTitle', 'Catch Analytics')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="analytics-title"
                data-tooltip-content={t('HomeTooltipsAnalytics', 'Analytics of catch trends over time')}
                style={{ cursor: 'pointer', color: theme.textSecondary, marginLeft: '0.5rem' }}
              />
              <Tooltip id="analytics-title" />
            </motion.h2>
            {analyticsLoading && <LoadingSpinner />}
            {analyticsError && (
              <ErrorMessage initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {analyticsError.message || t('HomeErrorsAnalytics', 'Failed to load analytics.')}
                <Button
                  variants={animationVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => queryClient.invalidateQueries(['analytics'])}
                  style={{ marginTop: '0.5rem' }}
                >
                  {t('HomeRetry', 'Retry')}
                </Button>
              </ErrorMessage>
            )}
            {analyticsData && <AnalyticsChart data={analyticsData} t={t} />}
          </AnalyticsSection>
        );
      case 'fisherman':
        return (
          <ListingsSection>
            <motion.h2 style={{ fontSize: clampFontSize(1.2, 3, 1.5), marginBottom: '1rem', color: theme.text }}>
              {t('HomeYourListings', 'Your Listings')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="listings-title"
                data-tooltip-content={t('HomeTooltipsListings', 'Your approved catch listings')}
                style={{ cursor: 'pointer', color: theme.textSecondary, marginLeft: '0.5rem' }}
              />
              <Tooltip id="listings-title" />
            </motion.h2>
            {listingsLoading && <LoadingSpinner />}
            {listingsError && (
              <ErrorMessage initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {listingsError.message || t('HomeErrorsNetwork', 'Network error. Please try again.')}
                <Button
                  variants={animationVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => queryClient.invalidateQueries(['catch-logs'])}
                  style={{ marginTop: '0.5rem' }}
                >
                  {t('HomeRetry', 'Retry')}
                </Button>
              </ErrorMessage>
            )}
            {!listingsLoading && listingsData?.length === 0 && (
              <EmptyState>
                <motion.p style={{ fontSize: clampFontSize(0.9, 2, 1), color: theme.textSecondary }}>
                  {t('HomeNoListings', 'No listings available.')}
                </motion.p>
              </EmptyState>
            )}
            {!listingsLoading && listingsData?.length > 0 && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {listingsData.map((listing) => (
                  <ListingCard key={listing.catch_id} listing={listing} t={t} />
                ))}
              </div>
            )}
          </ListingsSection>
        );
      case 'buyer':
        return (
          <ListingsSection>
            <motion.h2 style={{ fontSize: clampFontSize(1.2, 3, 1.5), marginBottom: '1rem', color: theme.text }}>
              {t('HomeAvailableListings', 'Available Listings')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="listings-title"
                data-tooltip-content={t('HomeTooltipsListings', 'Available approved catch listings')}
                style={{ cursor: 'pointer', color: theme.textSecondary, marginLeft: '0.5rem' }}
              />
              <Tooltip id="listings-title" />
            </motion.h2>
            {listingsLoading && <LoadingSpinner />}
            {listingsError && (
              <ErrorMessage initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {listingsError.message || t('HomeErrorsNetwork', 'Network error. Please try again.')}
                <Button
                  variants={animationVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => queryClient.invalidateQueries(['catch-logs'])}
                  style={{ marginTop: '0.5rem' }}
                >
                  {t('HomeRetry', 'Retry')}
                </Button>
              </ErrorMessage>
            )}
            {!listingsLoading && listingsData?.length === 0 && (
              <EmptyState>
                <motion.p style={{ fontSize: clampFontSize(0.9, 2, 1), color: theme.textSecondary }}>
                  {t('HomeNoListings', 'No listings available.')}
                </motion.p>
              </EmptyState>
            )}
            {!listingsLoading && listingsData?.length > 0 && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {listingsData.map((listing) => (
                  <ListingCard key={listing.catch_id} listing={listing} t={t} />
                ))}
              </div>
            )}
          </ListingsSection>
        );
      default:
        return null;
    }
  }, [user, theme, t, analyticsLoading, analyticsError, analyticsData, listingsLoading, listingsError, listingsData, queryClient]);

  return (
    <StyleSheetManager shouldForwardProp={isPropValid}>
      <AnimatePresence>
        <motion.div {...animationVariants.page}>
          <Helmet>
            <title>{t('HomeTitle', 'GETREECH')} | Fisheries Management System</title>
            <meta name="description" content={t('HomeSubtitle', 'Empowering Fishermen with Transparency')} />
            <meta name="keywords" content="fisheries, catch management, marketplace, analytics" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta property="og:title" content={t('HomeTitle', 'GETREECH')} />
            <meta property="og:description" content={t('HomeSubtitle', 'Empowering Fishermen with Transparency')} />
            <meta property="og:image" content="/assets/hero-bg.jpg" />
          </Helmet>
          <MainContent>
            <Header>
              <PageTitle variants={animationVariants} whileHover="hover">
                {t('HomeTitle', 'GETREECH')}
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  data-tooltip-id="page-title"
                  data-tooltip-content={t('HomeTooltipsTitle', 'Welcome to the GETREECH Fisheries Management System')}
                  style={{ cursor: 'pointer', color: theme.textSecondary, marginLeft: '0.5rem' }}
                />
                <Tooltip id="page-title" />
              </PageTitle>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: clampFontSize(0.5, 2, 1),
                  fontSize: clampFontSize(0.8, 2, 1),
                }}
              >
                {user && (
                  <>
                    {user.name} ({t(`RegisterRoles${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`, user.role)})
                    <ThemeSelector
                      onChange={(e) => handleThemeChange(e.target.value)}
                      value={theme.mode}
                      aria-label={t('HomeSelectTheme', 'Select Theme')}
                    >
                      <option value="light">{t('HomeThemeLight', 'Light')}</option>
                      <option value="dark">{t('HomeThemeDark', 'Dark')}</option>
                      <option value="ocean">{t('HomeThemeOcean', 'Ocean')}</option>
                      <option value="forest">{t('HomeThemeForest', 'Forest')}</option>
                    </ThemeSelector>
                    <IconButton
                      variants={animationVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => setState((prev) => ({ ...prev, showThemeModal: true }))}
                      aria-label={t('HomeCustomizeTheme', 'Customize Theme')}
                    >
                      <FontAwesomeIcon icon={faPaintRoller} />
                    </IconButton>
                    <IconButton
                      variants={animationVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => setState((prev) => ({ ...prev, notifications: [] }))}
                      aria-label={t('HomeNotifications', 'View Notifications')}
                    >
                      <FontAwesomeIcon icon={faBell} />
                      {notifications.length > 0 && <NotificationBadge>{notifications.length}</NotificationBadge>}
                    </IconButton>
                    <IconButton
                      variants={animationVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => {
                        logout();
                        navigate('/login');
                      }}
                      aria-label={t('HomeLogout', 'Logout')}
                    >
                      <FontAwesomeIcon icon={faSignOutAlt} />
                    </IconButton>
                  </>
                )}
              </div>
            </Header>
            {authLoading && <LoadingSpinner />}
            {!authLoading && (
              <>
                <HeroSection {...animationVariants.fade}>
                  <HeroOverlay initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} transition={{ duration: 1 }} />
                  <HeroContent>
                    <HeroTitle>{t('HomeTitle', 'GETREECH')}</HeroTitle>
                    <HeroSubtitle>{t('HomeSubtitle', 'Empowering Fishermen with Transparency')}</HeroSubtitle>
                    <div style={{ display: 'flex', gap: clampFontSize(0.5, 2, 0.75), justifyContent: 'center', flexWrap: 'wrap' }}>
                      {!user ? (
                        <>
                          <Button
                            variants={animationVariants}
                            whileHover="hover"
                            whileTap="tap"
                            onClick={() => navigate('/register')}
                            aria-label={t('HomeRegister', 'Register')}
                          >
                            {t('HomeRegister', 'Register')}
                          </Button>
                          <Button
                            variants={animationVariants}
                            whileHover="hover"
                            whileTap="tap"
                            onClick={() => navigate('/login')}
                            aria-label={t('HomeLogin', 'Login')}
                          >
                            {t('HomeLogin', 'Login')}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variants={animationVariants}
                            whileHover="hover"
                            whileTap="tap"
                            onClick={() =>
                              navigate(
                                user.role === 'admin'
                                  ? '/admin/dashboard'
                                  : user.role === 'buyer'
                                  ? '/market'
                                  : '/fisherman-dashboard'
                              )
                            }
                            aria-label={t(
                              user.role === 'admin'
                                ? 'HomeDashboard'
                                : user.role === 'buyer'
                                ? 'HomeMarketLabel'
                                : 'HomeFishermanDashboard',
                              user.role === 'admin' ? 'Dashboard' : user.role === 'buyer' ? 'Market' : 'Fisherman Dashboard'
                            )}
                          >
                            {t(
                              user.role === 'admin'
                                ? 'HomeDashboard'
                                : user.role === 'buyer'
                                ? 'HomeMarketLabel'
                                : 'HomeFishermanDashboard',
                              user.role === 'admin' ? 'Dashboard' : user.role === 'buyer' ? 'Market' : 'Fisherman Dashboard'
                            )}
                          </Button>
                          <Button
                            variants={animationVariants}
                            whileHover="hover"
                            whileTap="tap"
                            onClick={() => navigate('/market')}
                            aria-label={t('HomeExploreMarket', 'Explore Market')}
                          >
                            {t('HomeExploreMarket', 'Explore Market')}
                          </Button>
                        </>
                      )}
                    </div>
                  </HeroContent>
                </HeroSection>
                {notifications.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{
                      background: theme.card,
                      padding: '1rem',
                      borderRadius: '8px',
                      margin: '1rem 0',
                      color: theme.text,
                    }}
                  >
                    {notifications.map((notification) => (
                      <motion.p key={notification.id} style={{ fontSize: clampFontSize(0.9, 2, 1) }}>
                        {notification.message}
                      </motion.p>
                    ))}
                  </motion.div>
                )}
                <Suspense fallback={<LoadingSpinner />}>
                  {featuredListings.length > 0 && (
                    <CarouselSection>
                      <motion.h2 style={{ fontSize: clampFontSize(1.2, 3, 1.5), marginBottom: '1rem', color: theme.text }}>
                        {t('HomeFeaturedListings', 'Featured Listings')}
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          data-tooltip-id="carousel-title"
                          data-tooltip-content={t('HomeTooltipsCarousel', 'Browse featured catch listings')}
                          style={{ cursor: 'pointer', color: theme.textSecondary, marginLeft: '0.5rem' }}
                        />
                        <Tooltip id="carousel-title" />
                      </motion.h2>
                      <CarouselWrapper>
                        <AnimatePresence>
                          <CarouselItem key={carouselIndex} {...animationVariants.slide}>
                            <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10}>
                              <div style={{ textAlign: 'center' }}>
                                <CarouselImage
                                  src={featuredListings[carouselIndex]?.image_urls?.[0] || '/assets/fallback-fish.jpg'}
                                  alt={t('HomeImageAlt', { species: featuredListings[carouselIndex]?.species })}
                                  effect="blur"
                                />
                                <ListingTitle>
                                  {t('HomeListingTitle', {
                                    species: featuredListings[carouselIndex]?.species,
                                    id: featuredListings[carouselIndex]?.catch_id,
                                  })}
                                </ListingTitle>
                                <ListingDetail>
                                  {t('HomeWeight', { weight: featuredListings[carouselIndex]?.weight })}
                                </ListingDetail>
                                <ListingDetail>
                                  {t('HomePrice', { price: featuredListings[carouselIndex]?.price || 'N/A' })}
                                </ListingDetail>
                              </div>
                            </Tilt>
                          </CarouselItem>
                        </AnimatePresence>
                      </CarouselWrapper>
                      {featuredListings.length > 1 && (
                        <>
                          <CarouselNav
                            direction="left"
                            variants={animationVariants}
                            whileHover="hover"
                            whileTap="tap"
                            onClick={() =>
                              setState((prev) => ({
                                ...prev,
                                carouselIndex: (prev.carouselIndex - 1 + featuredListings.length) % featuredListings.length,
                              }))
                            }
                            aria-label={t('HomePreviousSlide', 'Previous Slide')}
                          >
                            <FontAwesomeIcon icon={faChevronLeft} />
                          </CarouselNav>
                          <CarouselNav
                            direction="right"
                            variants={animationVariants}
                            whileHover="hover"
                            whileTap="tap"
                            onClick={() =>
                              setState((prev) => ({
                                ...prev,
                                carouselIndex: (prev.carouselIndex + 1) % featuredListings.length,
                              }))
                            }
                            aria-label={t('HomeNextSlide', 'Next Slide')}
                          >
                            <FontAwesomeIcon icon={faChevronRight} />
                          </CarouselNav>
                        </>
                      )}
                    </CarouselSection>
                  )}
                  <StatsSection>
                    {[
                      {
                        value: statsData?.catches || 0,
                        label: t('HomeTotalCatches', 'Total Catches'),
                        delay: 0,
                        tooltip: t('HomeTooltipsTotalCatches', 'Total number of approved catches'),
                      },
                      {
                        value: statsData?.users || 0,
                        label: t('HomeRegisteredUsers', 'Registered Users'),
                        delay: 0.2,
                        tooltip: t('HomeTooltipsRegisteredUsers', 'Total registered users in the system'),
                      },
                      {
                        value: statsData?.value || 0,
                        label: t('HomeMarketValue', 'Market Value'),
                        delay: 0.4,
                        format: (value) => `KES ${Math.round(value).toLocaleString()}`,
                        tooltip: t('HomeTooltipsMarketValue', 'Total market value of catches in KES'),
                      },
                    ].map((stat) => (
                      <StatCard
                        key={stat.label}
                        value={stat.value}
                        label={stat.label}
                        delay={stat.delay}
                        format={stat.format}
                        tooltip={stat.tooltip}
                      />
                    ))}
                  </StatsSection>
                  {statsError && (
                    <ErrorMessage initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      {statsError.message || t('HomeErrorsNetwork', 'Network error. Please try again.')}
                      <Button
                        variants={animationVariants}
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => queryClient.invalidateQueries(['stats'])}
                        style={{ marginTop: '0.5rem' }}
                      >
                        {t('HomeRetry', 'Retry')}
                      </Button>
                    </ErrorMessage>
                  )}
                  {listingsData?.some((l) => l.latitude && l.longitude) && (
                    <MapSection>
                      <motion.h2 style={{ fontSize: clampFontSize(1.2, 3, 1.5), marginBottom: '1rem', color: theme.text }}>
                        {t('HomeMapTitle', 'Catch Locations')}
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          data-tooltip-id="map-title"
                          data-tooltip-content={t('HomeTooltipsMap', 'Locations of approved catches')}
                          style={{ cursor: 'pointer', color: theme.textSecondary, marginLeft: '0.5rem' }}
                        />
                        <Tooltip id="map-title" />
                      </motion.h2>
                      <MapContainer
                        center={[-4.0435, 39.6682]}
                        zoom={10}
                        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        {listingsData
                          .filter((l) => l.latitude && l.longitude)
                          .map((listing) => (
                            <Marker key={listing.catch_id} position={[listing.latitude, listing.longitude]} icon={customIcon}>
                              <Popup>{t('HomeListingTitle', { species: listing.species, id: listing.catch_id })}</Popup>
                            </Marker>
                          ))}
                      </MapContainer>
                    </MapSection>
                  )}
                  {getDashboardContent()}
                  <NewsletterSection>
                    <motion.h2 style={{ fontSize: clampFontSize(1.2, 3, 1.5), marginBottom: '1rem', color: theme.text }}>
                      {t('HomeNewsletterTitle', 'Stay Updated')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="newsletter-title"
                        data-tooltip-content={t('HomeTooltipsNewsletter', 'Subscribe to receive updates and news')}
                        style={{ cursor: 'pointer', color: theme.textSecondary, marginLeft: '0.5rem' }}
                      />
                      <Tooltip id="newsletter-title" />
                    </motion.h2>
                    <motion.p style={{ fontSize: clampFontSize(0.9, 2, 1), color: theme.textSecondary }}>
                      {t('HomeNewsletterSubtitle', 'Subscribe to our newsletter for the latest updates.')}
                    </motion.p>
                    <NewsletterForm onSubmit={handleNewsletterSignup}>
                      <NewsletterInput
                        type="email"
                        placeholder={t('HomeNewsletterPlaceholder', 'Enter your email')}
                        value={email}
                        onChange={(e) => setState((prev) => ({ ...prev, email: e.target.value }))}
                        required
                        aria-label={t('HomeNewsletterPlaceholder', 'Enter your email')}
                      />
                      <Button
                        variants={animationVariants}
                        whileHover="hover"
                        whileTap="tap"
                        type="submit"
                        aria-label={t('HomeNewsletterSubmit', 'Subscribe')}
                      >
                        {t('HomeNewsletterSubmit', 'Subscribe')}
                      </Button>
                    </NewsletterForm>
                  </NewsletterSection>
                </Suspense>
                {errorMessage && (
                  <ErrorMessage
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    role="alert"
                    aria-live="assertive"
                  >
                    {errorMessage}
                    {errorMessage.includes(t('HomeErrorsTimeout')) && (
                      <Button
                        variants={animationVariants}
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => queryClient.invalidateQueries(['catch-logs', 'stats', 'analytics'])}
                        style={{ marginTop: '0.5rem' }}
                      >
                        {t('HomeRetry', 'Retry')}
                      </Button>
                    )}
                  </ErrorMessage>
                )}
                <Suspense fallback={<LoadingSpinner />}>
                  {showThemeModal && (
                    <ThemePreviewModal
                      themes={themes}
                      onSelectTheme={handleThemeChange}
                      onClose={() => setState((prev) => ({ ...prev, showThemeModal: false }))}
                    />
                  )}
                </Suspense>
                <Footer>
                  <motion.div {...animationVariants.fade}>
                    <Link to="/about" style={{ color: theme.primary, margin: '0 1rem', textDecoration: 'none' }}>
                      {t('HomeAbout', 'About')}
                    </Link>
                    <Link to="/privacy" style={{ color: theme.primary, margin: '0 1rem', textDecoration: 'none' }}>
                      {t('HomePrivacy', 'Privacy')}
                    </Link>
                    <motion.p
                      style={{
                        fontSize: clampFontSize(0.8, 2, 0.9),
                        color: theme.textSecondary,
                        marginTop: '1rem',
                      }}
                    >
                      &copy; {new Date().getFullYear()} GETREECH. All rights reserved.
                    </motion.p>
                  </motion.div>
                </Footer>
              </>
            )}
          </MainContent>
        </motion.div>
      </AnimatePresence>
    </StyleSheetManager>
  );
};

export default Home;