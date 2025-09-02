// frontend/src/pages/About.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ThemeContext } from '../context/ThemeContext';

const AboutWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background};
  padding: 2rem;
`;

const AboutCard = styled.div`
  background: ${({ theme }) => theme.colors.card};
  padding: 2rem;
  border-radius: 8px;
  max-width: 600px;
  width: 100%;
`;

const About = () => {
  const { t } = useTranslation();
  const { colors } = React.useContext(ThemeContext);

  return (
    <AboutWrapper theme={colors}>
      <AboutCard theme={colors}>
        <h2>{t('about.title')}</h2>
        <p>{t('about.content')}</p>
      </AboutCard>
    </AboutWrapper>
  );
};

export default About;