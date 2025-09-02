import React, { useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from './i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import Register from './components/Register';
import CatchLog from './components/CatchLog';
import Market from './components/Market';
import Home from './components/Home';

// 🔒 Protected route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" />;
  return children;
};

// 🔹 Inner app that can safely use `useAuth`
const AppContent = () => {
  const { user } = useAuth();

  useEffect(() => {
    console.log('[App] Auth State:', user);
    console.log('[App] User Phone:', user?.phone || 'Not provided');
  }, [user]);

  return (
    <Router>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route
          path="/log-catch"
          element={
            <ProtectedRoute allowedRoles={['fisherman']}>
              <CatchLog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/market"
          element={
            <ProtectedRoute allowedRoles={['fisherman', 'buyer']}>
              <Market />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Navigate to="/register" />} />
        <Route path="/home" element={<Home />} />
        <Route path="/" element={<Navigate to="/home" />} />
      </Routes>
    </Router>
  );
};

const App = () => {
  // 🧠 Only create the QueryClient once
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
};

export default App;
