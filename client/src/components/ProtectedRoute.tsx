import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useInactivityTimeout } from '../hooks/useInactivityTimeout';
import { CircularProgress, Box } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loading, isAuthenticated } = useAuth();

  // 5 Minuten Inaktivitäts-Timeout
  useInactivityTimeout({
    timeout: 5 * 60 * 1000, // 5 Minuten in Millisekunden
    onTimeout: () => {
      console.log('🔒 Automatisches Logout aufgrund von Inaktivität');
    }
  });

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
