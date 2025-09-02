import React, { useContext } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import isPropValid from '@emotion/is-prop-valid';

const ModalOverlay = styled(motion.div).withConfig({ shouldForwardProp: isPropValid })`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled(motion.div).withConfig({ shouldForwardProp: isPropValid })`
  background: ${({ theme }) => theme.card};
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  color: ${({ theme }) => theme.text};
`;

const ThemeCard = styled.div.withConfig({ shouldForwardProp: isPropValid })`
  padding: 1rem;
  margin: 0.5rem 0;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  cursor: pointer;
  background: ${({ theme }) => theme.background};
  color: ${({ theme }) => theme.text};
  &:hover {
    background: ${({ theme }) => theme.backgroundSecondary};
  }
`;

const CloseButton = styled.button.withConfig({ shouldForwardProp: isPropValid })`
  background: none;
  border: none;
  color: ${({ theme }) => theme.text};
  font-size: 1.2rem;
  cursor: pointer;
  position: absolute;
  top: 1rem;
  right: 1rem;
`;

const ThemePreviewModal = ({ themes, onSelectTheme, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslation();

  return (
    <ModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <ModalContent initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
        <CloseButton onClick={onClose} aria-label={t('HomeCloseModal', 'Close')}>
          <FontAwesomeIcon icon={faTimes} />
        </CloseButton>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: theme.text }}>
          {t('HomeCustomizeTheme', 'Customize Theme')}
        </h2>
        {Object.keys(themes).map((themeKey) => (
          <ThemeCard
            key={themeKey}
            theme={themes[themeKey]}
            onClick={() => onSelectTheme(themeKey)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectTheme(themeKey)}
          >
            {t(`HomeTheme${themeKey.charAt(0).toUpperCase() + themeKey.slice(1)}`, themeKey)}
          </ThemeCard>
        ))}
      </ModalContent>
    </ModalOverlay>
  );
};

export default ThemePreviewModal;