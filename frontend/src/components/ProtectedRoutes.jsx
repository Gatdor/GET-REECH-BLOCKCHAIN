import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return null; // or a spinner

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect based on role
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/market'} replace />;
  }

  return children;
};

export default ProtectedRoute;
