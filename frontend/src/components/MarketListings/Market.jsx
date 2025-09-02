import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import { useAuth, api } from '../../context/AuthContext';
import * as Sentry from '@sentry/react';

const MarketContainer = styled.div`
  padding: clamp(1rem, 3vw, 2rem);
  background: ${({ theme }) => theme.background || '#F1F5F9'};
  min-height: 100vh;
`;

const Title = styled.h1`
  font-size: clamp(1.2rem, 3vw, 1.5rem);
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  margin-bottom: clamp(1rem, 3vw, 2rem);
`;

const ProductList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
`;

const ProductCard = styled(motion.div)`
  background: white;
  padding: clamp(1rem, 2vw, 1.5rem);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const ErrorMessage = styled(motion.p)`
  color: #EF4444;
  font-size: clamp(0.8rem, 2vw, 0.875rem);
  text-align: center;
  margin-bottom: clamp(0.5rem, 2vw, 1rem);
`;

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const Market = () => {
  const { t } = useTranslation();
  const { isOnline } = useAuth();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');
      try {
        if (isOnline) {
          const response = await api.get('/catch-logs', { params: { status: 'approved' } });
          setProducts(response.data);
        } else {
          setError(t('market.errors.offline'));
        }
      } catch (error) {
        Sentry.captureException(error);
        setError(error.response?.data?.message || t('market.errors.generic'));
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [isOnline, t]);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      <MarketContainer>
        <Title>{t('Market')}</Title>
        {(error) && (
          <ErrorMessage
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            role="alert"
          >
            {error}
          </ErrorMessage>
        )}
        {loading && <p>{t('market.loading')}</p>}
        <ProductList>
          {products.map((product) => (
            <ProductCard
              key={product.batch_id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <h3>{product.species}</h3>
              <p>{t('Price')}: ${product.price}</p>
              <p>{t('Weight')}: {product.weight} kg</p>
              <p>{t('Quality Score')}: {product.quality_score}</p>
              {product.image_urls && product.image_urls[0] && (
                <img
                  src={product.image_urls[0]}
                  alt={t('profile.avatarAlt', { name: product.species })}
                  style={{ maxWidth: '100%', borderRadius: '8px' }}
                />
              )}
            </ProductCard>
          ))}
        </ProductList>
      </MarketContainer>
    </motion.div>
  );
};

export default Market;