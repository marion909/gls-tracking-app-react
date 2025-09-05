import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/apiService';

const Login: React.FC = () => {
  const [masterPassword, setMasterPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Nachricht von automatischem Logout anzeigen
  const logoutMessage = location.state?.message;

  useEffect(() => {
    checkAppStatus();
  }, []);

  const checkAppStatus = async () => {
    try {
      const response = await apiFetch('/api/auth/status');
      const data = await response.json();
      
      if (response.ok) {
        setIsFirstRun(data.data.isFirstRun);
      }
    } catch (error) {
      console.error('Fehler beim Prüfen des App-Status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword.trim()) {
      setError('Bitte geben Sie das Master-Passwort ein');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login({ masterPassword });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography component="h1" variant="h4" gutterBottom>
              GLS Tracking System
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Master-Passwort Anmeldung
            </Typography>

            {logoutMessage && (
              <Alert severity="warning" sx={{ width: '100%', mb: 2 }}>
                {logoutMessage}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="masterPassword"
                label="Master-Passwort"
                type="password"
                id="masterPassword"
                autoComplete="current-password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                disabled={loading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Anmelden'}
              </Button>
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 2 }}>
                {isFirstRun && !statusLoading && (
                  <Link to="/register" style={{ textDecoration: 'none' }}>
                    <Typography variant="body2" color="primary">
                      Erstmalige Einrichtung? Hier registrieren
                    </Typography>
                  </Link>
                )}
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
