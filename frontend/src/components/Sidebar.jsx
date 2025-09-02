import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTachometerAlt, faFish, faComment, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { ThemeContext } from '../context/ThemeContext';
import { StyleSheetManager } from 'styled-components';
import isPropValid from '@emotion/is-prop-valid';

const commonStyles = css`
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const clampFontSize = (min, vw, max) => `clamp(${min}rem, ${vw}vw, ${max}rem)`;

const SidebarContainer = styled(motion.aside)`
  width: clamp(200px, 20vw, 250px);
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: clamp(1rem, 3vw, 2rem);
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 500;
  ${commonStyles}
  border-right: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  @media (max-width: 768px) {
    width: clamp(200px, 60vw, 250px);
    transform: ${({ isOpen }) => (isOpen ? 'translateX(0)' : 'translateX(-100%)')};
    transition: transform 0.3s ease-in-out;
  }
`;

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1.5vw, 0.75rem);
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  text-decoration: none;
  font-size: ${clampFontSize(0.9, 2, 1)};
  border-radius: 8px;
  transition: background 0.3s;
  &:hover {
    background: ${({ theme }) => theme.backgroundSecondary || '#E2E8F0'};
  }
  &.active {
    background: ${({ theme }) => theme.primary || '#3B82F6'};
    color: white;
  }
`;

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);

  return (
    <StyleSheetManager shouldForwardProp={isPropValid}>
      <SidebarContainer
        isOpen={isOpen}
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ duration: 0.3 }}
      >
        <Nav>
          <NavItem
            to="/fisherman-dashboard"
            onClick={() => window.innerWidth <= 768 && toggleSidebar()}
            end
          >
            <FontAwesomeIcon icon={faTachometerAlt} />
            {t('SidebarDashboard', 'Dashboard')}
          </NavItem>
          <NavItem
            to="/my-catches"
            onClick={() => window.innerWidth <= 768 && toggleSidebar()}
          >
            <FontAwesomeIcon icon={faFish} />
            {t('SidebarMyCatches', 'My Catches')}
          </NavItem>
          <NavItem
            to="/feedback"
            onClick={() => window.innerWidth <= 768 && toggleSidebar()}
          >
            <FontAwesomeIcon icon={faComment} />
            {t('SidebarFeedback', 'Feedback')}
          </NavItem>
          <NavItem
            to="/logout"
            onClick={() => window.innerWidth <= 768 && toggleSidebar()}
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
            {t('SidebarLogout', 'Logout')}
          </NavItem>
        </Nav>
      </SidebarContainer>
    </StyleSheetManager>
  );
};

export default Sidebar;