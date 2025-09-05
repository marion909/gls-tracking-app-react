import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

interface SetupData {
  masterPassword: string;
  confirmPassword: string;
  glsUsername: string;
  glsPassword: string;
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState<SetupData>({
    masterPassword: '',
    confirmPassword: '',
    glsUsername: '',
    glsPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const steps = ['Master Password erstellen', 'GLS Zugangsdaten'];

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const validateMasterPassword = () => {
    if (formData.masterPassword.length < 8) {
      setError('Master Password muss mindestens 8 Zeichen lang sein');
      return false;
    }
    if (formData.masterPassword !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (validateMasterPassword()) {
        setActiveStep(1);
      }
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeStep === 0) {
      handleNext();
      return;
    }

    if (!formData.glsUsername || !formData.glsPassword) {
      setError('Bitte GLS Benutzername und Passwort eingeben');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          masterPassword: formData.masterPassword,
          glsUsername: formData.glsUsername,
          glsPassword: formData.glsPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Setup fehlgeschlagen');
      }

      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Setup fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <>
            <TextField
              margin="normal"
              required
              fullWidth
              id="masterPassword"
              label="Master Password"
              name="masterPassword"
              type="password"
              autoFocus
              value={formData.masterPassword}
              onChange={handleChange}
              disabled={loading}
              helperText="Mindestens 8 Zeichen"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="confirmPassword"
              label="Master Password bestätigen"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
            />
          </>
        );
      case 1:
        return (
          <>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Ihre GLS Zugangsdaten werden verschlüsselt gespeichert
            </Typography>
            <TextField
              margin="normal"
              required
              fullWidth
              id="glsUsername"
              label="GLS Benutzername"
              name="glsUsername"
              autoComplete="username"
              value={formData.glsUsername}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="glsPassword"
              label="GLS Passwort"
              name="glsPassword"
              type="password"
              autoComplete="current-password"
              value={formData.glsPassword}
              onChange={handleChange}
              disabled={loading}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Container component="main" maxWidth="md">
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
            <PersonAdd sx={{ m: 1, bgcolor: 'secondary.main', p: 1, borderRadius: '50%', color: 'white' }} />
            <Typography component="h1" variant="h4" gutterBottom>
              GLS Tracking System
            </Typography>
            <Typography component="h2" variant="h5" gutterBottom>
              Ersteinrichtung
            </Typography>

            <Box sx={{ width: '100%', mt: 3, mb: 3 }}>
              <Stepper activeStep={activeStep}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              {renderStepContent(activeStep)}

              <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
                <Button
                  color="inherit"
                  disabled={activeStep === 0 || loading}
                  onClick={handleBack}
                  sx={{ mr: 1 }}
                >
                  Zurück
                </Button>
                <Box sx={{ flex: '1 1 auto' }} />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? (
                    <CircularProgress size={24} />
                  ) : activeStep === steps.length - 1 ? (
                    'Einrichtung abschließen'
                  ) : (
                    'Weiter'
                  )}
                </Button>
              </Box>

              <Box textAlign="center" sx={{ mt: 3 }}>
                <Link to="/login">
                  <Typography variant="body2" color="primary">
                    Bereits eingerichtet? Zur Anmeldung
                  </Typography>
                </Link>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
