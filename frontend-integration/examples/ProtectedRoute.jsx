import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services';

/**
 * Protected Route Component
 * Wrap your protected routes with this component
 */
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
