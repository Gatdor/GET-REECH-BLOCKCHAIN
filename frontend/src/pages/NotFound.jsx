// frontend/src/pages/NotFound.jsx
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { ThemeContext } from '../context/ThemeContext';

const NotFoundWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background};
  padding: 1rem;
`;

const NotFoundCard = styled.div`
  background: ${({ theme }) => theme.colors.card};
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
  text-align: center;
`;

const Button = styled.button`
  padding: 0.75rem;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
  }
`;

const NotFound = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { colors } = useContext(ThemeContext);

  return (
    <NotFoundWrapper theme={colors}>
      <NotFoundCard theme={colors}>
        <h2>{t('notFound.title')}</h2>
        <p>{t('notFound.message')}</p>
        <Button onClick={() => navigate('/')} theme={colors}>
          {t('notFound.backToHome')}
        </Button>
      </NotFoundCard>
    </NotFoundWrapper>
  );
};

export default NotFound;