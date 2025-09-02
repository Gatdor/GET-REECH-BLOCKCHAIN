import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import * as Sentry from '@sentry/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';

const MarketWrapper = styled.div`
  padding: clamp(1rem, 3vw, 2rem);
  background: ${({ theme }) => theme.background || '#F1F5F9'};
  min-height: 100vh;
  @media (maxWidth: 768px) {
    padding: clamp(0.5rem, 2vw, 1rem);
  }
`;

const FilterSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: clamp(0.5rem, 2vw, 1rem);
  margin-bottom: 1rem;
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  border-radius: 8px;
  font-size: clamp(0.9rem, 2vw, 1rem);
`;

const Select = styled.select`
  padding: 0.5rem;
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  border-radius: 8px;
  font-size: clamp(0.9rem, 2vw, 1rem);
`;

const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
`;

const ProductCard = styled(motion.div)`
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  border-radius: 8px;
  padding: 1rem;
  background: ${({ theme }) => theme.card || '#ffffff'};
`;

const OrderButton = styled(motion.button)`
  background: linear-gradient(90deg, #1E3A8A 0%, #3B82F6 100%);
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
  &:disabled {
    background: #6B7280;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled(motion.p)`
  background: #fee2e2;
  color: #991b1b;
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
`;

const SuccessMessage = styled(motion.p)`
  background: #d1fae5;
  color: #065f46;
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
`;

const Market = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ species: '', price_min: '', price_max: '', location: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState({ product_id: null, quantity: '', phone: '' });

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const params = {};
        if (filters.species) params.species = filters.species;
        if (filters.price_min) params.price_min = filters.price_min;
        if (filters.price_max) params.price_max = filters.price_max;
        if (filters.location) params.location = filters.location;

        const response = await axios.get(`${import.meta.env.VITE_API_URL}/products`, {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });
        setProducts(response.data.products || []);
        setError('');
      } catch (err) {
        console.error('[Market] Fetch error:', err.message);
        Sentry.captureException(err);
        setError(t('market.errors.fetch'));
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [filters, t]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleOrderChange = (productId, field, value) => {
    setOrderData({ ...orderData, product_id: productId, [field]: value });
  };

  const handleOrder = async (productId) => {
    if (!orderData.quantity || !orderData.phone) {
      setError(t('market.errors.missingFields'));
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/orders`,
        { product_id: productId, quantity: parseFloat(orderData.quantity), phone: orderData.phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProducts(products.map(p => p.id === productId ? { ...p, quantity: p.quantity - parseFloat(orderData.quantity) } : p));
      setSuccess(t('market.success.order'));
      setError('');
      setOrderData({ product_id: null, quantity: '', phone: '' });
    } catch (err) {
        console.error('[Market] Order error:', err.message);
        Sentry.captureException(err);
        setError(t('market.errors.order'));
        setSuccess('');
    } finally {
        setLoading(false);
    }
};

  return (
    <MarketWrapper>
      <h2>{t('market.title')}</h2>
      <AnimatePresence>
        {error && (
          <ErrorMessage initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {error}
          </ErrorMessage>
        )}
        {success && (
          <SuccessMessage initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {success}
          </SuccessMessage>
        )}
      </AnimatePresence>
      <FilterSection>
        <Input
          type="text"
          name="species"
          placeholder={t('market.filters.species')}
          value={filters.species}
          onChange={handleFilterChange}
          data-tooltip-id="species-tip"
          data-tooltip-content={t('market.tooltips.species')}
        />
        <Tooltip id="species-tip" />
        <Input
          type="number"
          name="price_min"
          placeholder={t('market.filters.priceMin')}
          value={filters.price_min}
          onChange={handleFilterChange}
          data-tooltip-id="price-min-tip"
          data-tooltip-content={t('market.tooltips.priceMin')}
        />
        <Tooltip id="price-min-tip" />
        <Input
          type="number"
          name="price_max"
          placeholder={t('market.filters.priceMax')}
          value={filters.price_max}
          onChange={handleFilterChange}
          data-tooltip-id="price-max-tip"
          data-tooltip-content={t('market.tooltips.priceMax')}
        />
        <Tooltip id="price-max-tip" />
        <Select name="location" value={filters.location} onChange={handleFilterChange}>
          <option value="">{t('market.filters.location')}</option>
          <option value="Mombasa">Mombasa</option>
          <option value="Nairobi">Nairobi</option>
          <option value="Kisumu">Kisumu</option>
        </Select>
      </FilterSection>
      <ProductGrid>
        {products.map(product => (
          <ProductCard
            key={product.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <img
              src={product.image || '/assets/fallback-fish.jpg'}
              alt={product.species}
              style={{ width: '100%', borderRadius: '8px', maxHeight: '150px', objectFit: 'cover' }}
            />
            <h3>{product.species} ({product.type})</h3>
            <p>{t('market.quantity')}: {product.quantity} kg</p>
            <p>{t('market.price')}: KES {product.price}</p>
            <p>{t('market.location')}: {product.location}</p>
            <Input
              type="number"
              placeholder={t('market.orderQuantity')}
              min="1"
              max={product.quantity}
              value={orderData.product_id === product.id ? orderData.quantity : ''}
              onChange={(e) => handleOrderChange(product.id, 'quantity', e.target.value)}
              disabled={loading || !product.quantity}
            />
            <Input
              type="text"
              placeholder={t('market.phone')}
              value={orderData.product_id === product.id ? orderData.phone : ''}
              onChange={(e) => handleOrderChange(product.id, 'phone', e.target.value)}
              disabled={loading}
              data-tooltip-id="phone-tip"
              data-tooltip-content={t('market.tooltips.phone')}
            />
            <Tooltip id="phone-tip" />
            <OrderButton
              onClick={() => handleOrder(product.id)}
              disabled={loading || !product.quantity}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('market.order')}
            </OrderButton>
          </ProductCard>
        ))}
      </ProductGrid>
      {loading && <p>{t('market.loading')}</p>}
    </MarketWrapper>
  );
};

export default Market;