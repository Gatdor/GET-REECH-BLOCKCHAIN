// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';


const resources = {
  en: {
    translation: {
      appName: 'Fish Management System',
      mainContent: 'Main content',
      mainNavigation: 'Main navigation',
      toggleNav: 'Toggle navigation',
      login: 'Login (Ingia)',
      register: 'Register (Jisajili)',
      logCatch: 'Log Catch (Rekodi Samaki)',
      market: 'Market (Soko)',
      dashboard: 'Dashboard (Dashibodi)',
      feedback: 'Feedback (Maoni)',
      profile: 'Profile (Wasifu)',
      logout: 'Logout (Ondoka)',
      offlineMode: 'You are offline. Data will sync when online.',
      dismissError: 'Dismiss error',
      dismiss: 'Dismiss',
      selectLanguage: 'Select language',
      english: 'English',
      swahili: 'Swahili',
    },
  },
  sw: {
    translation: {
      appName: 'Mfumo wa Usimamizi wa Samaki',
      mainContent: 'Maudhui ya Msingi',
      mainNavigation: 'Urambazaji wa Msingi',
      toggleNav: 'Badili Urambazaji',
      login: 'Ingia',
      register: 'Jisajili',
      logCatch: 'Rekodi Samaki',
      market: 'Soko',
      dashboard: 'Dashibodi',
      feedback: 'Maoni',
      profile: 'Wasifu',
      logout: 'Ondoka',
      offlineMode: 'Uko nje ya mtandao. Data itasawazishwa ukiwa mtandaoni.',
      dismissError: 'Ondoa hitilafu',
      dismiss: 'Ondoa',
      selectLanguage: 'Chagua Lugha',
      english: 'Kiingereza',
      swahili: 'Kiswahili',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});
export default i18n;
