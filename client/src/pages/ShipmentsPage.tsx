import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  GetApp as LoadIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';
import { apiFetch } from '../services/apiService';

interface Shipment {
  id: number;
  trackingNumber: string;
  customerName: string;
  status: string;
  location?: string;
  lastUpdate?: string;
  isOverdue: boolean;
  trackingEvents?: any[];
}

interface ProgressData {
  step: string;
  message: string;
  progress: number;
  timestamp: Date;
}

const ShipmentsPage: React.FC = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFromGls, setLoadingFromGls] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    loadShipments();
    setupSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const setupSocket = () => {
    const token = localStorage.getItem('token') || document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];

    if (token) {
      const newSocket = io('http://localhost:5000', {
        auth: { token }
      });

      newSocket.on('progress', (data: ProgressData) => {
        setProgress(data);
        if (data.progress === 100) {
          setTimeout(() => {
            setProgress(null);
            loadShipments(); // Reload shipments after completion
          }, 2000);
        }
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
      });

      setSocket(newSocket);
    }
  };

  const loadShipments = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/shipments/list');

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Fehler beim Laden der Sendungen');
      }

      setShipments(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Sendungen');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadFromGls = () => {
    setMasterPassword('');
    setShowPasswordDialog(true);
  };

  const confirmLoadFromGls = async () => {
    if (!masterPassword) {
      setError('Bitte Master Password eingeben');
      return;
    }

    setLoadingFromGls(true);
    setError('');
    setSuccess('');
    setShowPasswordDialog(false);
    setProgress({ step: 'starting', message: 'Vorbereitung...', progress: 0, timestamp: new Date() });

    try {
      const response = await apiFetch('/api/shipments/load-from-gls', {
        method: 'POST',
        body: JSON.stringify({
          masterPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Fehler beim Laden der Sendungen');
      }

      setSuccess(data.message);
      setMasterPassword('');
      
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Sendungen');
      setProgress(null);
    } finally {
      setLoadingFromGls(false);
    }
  };

  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('zugestellt') || lowerStatus.includes('delivered')) {
      return 'success';
    } else if (lowerStatus.includes('unterwegs') || lowerStatus.includes('transit')) {
      return 'primary';
    } else if (lowerStatus.includes('problem') || lowerStatus.includes('exception') || 
               lowerStatus.includes('storniert') || lowerStatus.includes('cancelled')) {
      return 'error';
    }
    return 'default';
  };

  const getStatusIcon = (shipment: Shipment) => {
    if (shipment.isOverdue) {
      return <WarningIcon color="error" />;
    }
    
    const lowerStatus = shipment.status.toLowerCase();
    if (lowerStatus.includes('zugestellt') || lowerStatus.includes('delivered')) {
      return <CheckIcon color="success" />;
    }
    
    return <ScheduleIcon color="primary" />;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unbekannt';
    try {
      return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Sendungsübersicht
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadShipments}
            disabled={loading || loadingFromGls}
          >
            Aktualisieren
          </Button>
          <Button
            variant="contained"
            startIcon={<LoadIcon />}
            onClick={handleLoadFromGls}
            disabled={loading || loadingFromGls}
          >
            Vom GLS Portal laden
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {progress && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {progress.message}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={progress.progress} 
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {progress.progress}% abgeschlossen
            </Typography>
          </CardContent>
        </Card>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Sendungsnummer</TableCell>
              <TableCell>Kunde</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Standort</TableCell>
              <TableCell>Letzte Aktualisierung</TableCell>
              <TableCell align="center">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && !shipments.length ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <LinearProgress />
                  <Typography sx={{ mt: 1 }}>Lade Sendungen...</Typography>
                </TableCell>
              </TableRow>
            ) : shipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">
                    Keine Sendungen gefunden. Laden Sie Sendungen vom GLS Portal.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              shipments.map((shipment) => (
                <TableRow 
                  key={shipment.id}
                  sx={{ 
                    backgroundColor: shipment.isOverdue ? 'rgba(211, 47, 47, 0.05)' : 'inherit'
                  }}
                >
                  <TableCell>
                    <Tooltip title={shipment.isOverdue ? 'Überfällig' : 'Normal'}>
                      {getStatusIcon(shipment)}
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {shipment.trackingNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>{shipment.customerName}</TableCell>
                  <TableCell>
                    <Chip 
                      label={shipment.status}
                      color={getStatusColor(shipment.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{shipment.location || '-'}</TableCell>
                  <TableCell>{formatDate(shipment.lastUpdate)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Details anzeigen">
                      <IconButton size="small">
                        <SearchIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)}>
        <DialogTitle>Master Password eingeben</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Geben Sie Ihr Master Password ein, um Sendungen vom GLS Portal zu laden.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Master Password"
            type="password"
            fullWidth
            variant="outlined"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                confirmLoadFromGls();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={confirmLoadFromGls}
            variant="contained"
            disabled={!masterPassword || loadingFromGls}
          >
            {loadingFromGls ? 'Wird geladen...' : 'Laden'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ShipmentsPage;
