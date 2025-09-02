import React, { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { Helmet } from 'react-helmet-async';
import { ThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import * as Sentry from '@sentry/react';
import { createBatchOnBlockchain } from '../services/blockchain';

// Styled Components
const PrivacyWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.background || '#f9fafb'} 0%,
    ${({ theme }) => theme.backgroundSecondary || '#e5e7eb'} 100%
  );
  padding: clamp(1rem, 2vw, 2rem);
  font-family: 'Roboto', sans-serif;
  @media (max-width: 768px) {
    padding: clamp(0.75rem, 2vw, 1rem);
  }
  @media (min-width: 1280px) {
    padding: clamp(1.5rem, 2vw, 2.5rem);
  }
`;

const PrivacyCard = styled(motion.div)`
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: clamp(1.5rem, 2vw, 2.5rem);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.border || '#e5e7eb'};
  @media (max-width: 768px) {
    padding: clamp(1rem, 2vw, 1.5rem);
    margin: 0 clamp(0.5rem, 2vw, 1rem);
    border-radius: 8px;
  }
  @media (min-width: 1280px) {
    padding: clamp(2rem, 2vw, 3rem);
    max-width: 900px;
  }
`;

const Title = styled.h1`
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700;
  color: ${({ theme }) => theme.text || '#1f2937'};
  margin-bottom: clamp(1rem, 2vw, 1.5rem);
  text-align: center;
  @media (min-width: 1280px) {
    font-size: clamp(2rem, 4vw, 3rem);
  }
`;

const Section = styled.section`
  margin-bottom: clamp(1.5rem, 2vw, 2rem);
`;

const SectionTitle = styled.h2`
  font-size: clamp(1.25rem, 3vw, 1.5rem);
  font-weight: 600;
  color: ${({ theme }) => theme.text || '#1f2937'};
  margin-bottom: clamp(0.5rem, 2vw, 0.75rem);
`;

const Paragraph = styled.p`
  color: ${({ theme }) => theme.textSecondary || '#6b7280'};
  line-height: 1.8;
  font-size: clamp(0.9rem, 2vw, 1rem);
  @media (max-width: 768px) {
    font-size: clamp(0.85rem, 2vw, 0.95rem);
  }
`;

const cardVariants = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, y: -50, transition: { duration: 0.3 } },
};

const Privacy = () => {
  const { t, i18n } = useTranslation('privacy', { useSuspense: false });
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();

  useEffect(() => {
    // Log page visit to blockchain
    const logPageVisit = async () => {
      try {
        await createBatchOnBlockchain({
          userId: user?.id || 'anonymous',
          page: 'privacy',
          timestamp: new Date().toISOString(),
        });
        console.log('Privacy page visit logged to blockchain');
      } catch (error) {
        console.warn('Failed to log page visit:', error.message);
        Sentry.captureException(error);
      }
    };
    logPageVisit();

    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cardVariants.transition = { duration: 0 };
    }
  }, [user]);

  return (
    <PrivacyWrapper theme={theme}>
      <Helmet>
        <title>{t('title')} | Fisheries Management System</title>
        <meta name="description" content={t('meta.description')} />
        <meta name="keywords" content="privacy policy, fisheries, data protection, blockchain" />
        <meta property="og:title" content={t('title')} />
        <meta property="og:description" content={t('meta.description')} />
        <meta name="robots" content="index, follow" />
        <html lang={i18n.language} />
      </Helmet>
      <AnimatePresence>
        <PrivacyCard
          variants={cardVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          theme={theme}
          role="main"
          aria-labelledby="privacy-title"
        >
          <Title id="privacy-title">{t('title')}</Title>
          <Section>
            <SectionTitle>{t('introduction.title')}</SectionTitle>
            <Paragraph>{t('introduction.text')}</Paragraph>
          </Section>
          <Section>
            <SectionTitle>{t('dataCollection.title')}</SectionTitle>
            <Paragraph>{t('dataCollection.text')}</Paragraph>
          </Section>
          <Section>
            <SectionTitle>{t('dataUsage.title')}</SectionTitle>
            <Paragraph>{t('dataUsage.text')}</Paragraph>
          </Section>
          <Section>
            <SectionTitle>{t('dataSharing.title')}</SectionTitle>
            <Paragraph>{t('dataSharing.text')}</Paragraph>
          </Section>
          <Section>
            <SectionTitle>{t('contact.title')}</SectionTitle>
            <Paragraph>{t('contact.text')}</Paragraph>
          </Section>
        </PrivacyCard>
      </AnimatePresence>
    </PrivacyWrapper>
  );
};

export default Privacy;

