import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';

const Nav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: ${({ theme }) => theme.primary || '#1e40af'};
  color: white;
`;

const Brand = styled.span`
  font-size: 1.5rem;
  font-weight: bold;
`;

const Toggler = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
`;

const NavList = styled.ul`
  display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};
  flex-direction: column;
  gap: 1rem;
  list-style: none;
  margin: 0;
  padding: 1rem;
  background: ${({ theme }) => theme.primary || '#1e40af'};
  position: absolute;
  top: 60px;
  right: 0;
  width: 200px;
  @media (min-width: 768px) {
    position: static;
    flex-direction: row;
    width: auto;
    background: none;
    display: flex;
  }
`;

const NavItem = styled.li`
  a, button {
    color: white;
    text-decoration: none;
    padding: 0.5rem;
    display: block;
    background: none;
    border: none;
    cursor: pointer;
    &.active {
      font-weight: bold;
      text-decoration: underline;
    }
  }
`;

const LanguageSelect = styled.select`
  padding: 0.5rem;
  background: white;
  border: none;
  border-radius: 4px;
  margin-left: 1rem;
`;

const LanguageIcon = styled.img`
  width: 24px;
  height: 24px;
  vertical-align: middle;
  margin-left: 0.5rem;
`;

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser, supabase } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  return (
    <Nav role="navigation" aria-label={t('mainNavigation')}>
      <Brand>{t('appName')}</Brand>
      <Toggler
        onClick={toggleMenu}
        aria-label={t('toggleNav')}
        aria-expanded={isOpen}
      >
        <FontAwesomeIcon icon={faBars} />
      </Toggler>
      <NavList $isOpen={isOpen}>
        {!user && (
          <>
            <NavItem>
              <NavLink to="/login" className="nav-link" end>
                {t('login')}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink to="/register" className="nav-link" end>
                {t('register')}
              </NavLink>
            </NavItem>
          </>
        )}
        {user && (
          <>
            <NavItem>
              <NavLink to="/log-catch" className="nav-link">
                {t('logCatch')}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink to="/market" className="nav-link">
                {t('market')}
              </NavLink>
            </NavItem>
            {user.role === 'admin' && (
              <NavItem>
                <NavLink to="/dashboard" className="nav-link">
                  {t('dashboard')}
                </NavLink>
              </NavItem>
            )}
            <NavItem>
              <NavLink to="/feedback" className="nav-link">
                {t('feedback')}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink to="/profile" className="nav-link">
                {t('profile')}
              </NavLink>
            </NavItem>
            <NavItem>
              <button className="nav-link btn-link" onClick={handleLogout}>
                <FontAwesomeIcon icon={faSignOutAlt} /> {t('logout')}
              </button>
            </NavItem>
          </>
        )}
        <NavItem>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <LanguageSelect
              onChange={(e) => changeLanguage(e.target.value)}
              defaultValue="en"
              aria-label={t('selectLanguage')}
            >
              <option value="en">{t('english')}</option>
              <option value="sw">{t('swahili')}</option>
            </LanguageSelect>
            <LanguageIcon src="/assets/fish.jpg" alt="Language icon" />
          </div>
        </NavItem>
      </NavList>
    </Nav>
  );
};

export default Navbar;