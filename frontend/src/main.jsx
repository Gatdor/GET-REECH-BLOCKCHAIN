import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';

import i18n from './i18n';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Create a QueryClient instance
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <ErrorBoundary>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </ErrorBoundary>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </I18nextProvider>
  </HelmetProvider>
);
