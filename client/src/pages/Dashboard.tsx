import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress,
  Tooltip,
  FormControlLabel,
  Checkbox,
  Collapse,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  GetApp as LoadIcon,
} from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';
import { SessionTimer } from '../components/SessionTimer';

interface TrackingInfo {
  id: number;
  trackingNumber: string;
  customerName: string;
  status: string;
  address: string;
  lastUpdate: string;
  isOverdue: boolean;
  trackingEvents: TrackingEvent[];
}

interface TrackingEvent {
  id: number;
  date: string;
  time: string;
  description: string;
  location: string;
}

const Dashboard: React.FC = () => {
  const [trackings, setTrackings] = useState<TrackingInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedTracking, setSelectedTracking] = useState<TrackingInfo | null>(null);
  const [error, setError] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  
  // GLS Portal loading states
  const [loadingFromGls, setLoadingFromGls] = useState(false);
  const [success, setSuccess] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [lastGlsSync, setLastGlsSync] = useState<Date | null>(null);
  
  // Filter states
  const [hideDelivered, setHideDelivered] = useState(() => {
    return localStorage.getItem('hideDelivered') === 'true';
  });
  const [hideCancelled, setHideCancelled] = useState(() => {
    return localStorage.getItem('hideCancelled') === 'true';
  });
  const [hideOverdue, setHideOverdue] = useState(() => {
    return localStorage.getItem('hideOverdue') === 'true';
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadTrackings();
    loadLastSync();
    setupSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [hideDelivered, hideCancelled]);

  const setupSocket = () => {
    const token = localStorage.getItem('token') || document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];

    if (token) {
      const newSocket = io('http://localhost:5000', {
        auth: { token }
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
      });

      setSocket(newSocket);
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

    try {
      const response = await fetch('/api/shipments/load-from-gls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
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
      
      // Update last sync information and reload data
      await loadLastSync();
      await loadTrackings();
      
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Sendungen');
    } finally {
      setLoadingFromGls(false);
    }
  };

  const loadTrackings = async () => {
    setLoading(true);
    try {
      // Build query parameters for filtering
      const params = new URLSearchParams();
      if (hideDelivered) params.append('hideDelivered', 'true');
      if (hideCancelled) params.append('hideCancelled', 'true');
      
      const query = params.toString();
      const url = query ? `/api/packages?${query}` : '/api/packages';
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (response.ok) {
        setTrackings(data.data);
      } else {
        setError(data.message || 'Fehler beim Laden der Sendungen');
      }
    } catch (err) {
      setError('Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  };

  const loadLastSync = async () => {
    try {
      console.log('🔍 Loading last sync information...');
      const response = await fetch('/api/shipments/last-sync', {
        credentials: 'include',
      });
      const data = await response.json();
      
      console.log('📡 Last sync response:', { 
        ok: response.ok, 
        status: response.status, 
        data: data 
      });
      
      if (response.ok && data.data.lastSync) {
        const syncDate = new Date(data.data.lastSync);
        console.log('✅ Setting last sync date:', syncDate);
        setLastGlsSync(syncDate);
      } else {
        console.log('❌ No lastSync data found or response not ok');
      }
    } catch (err) {
      console.error('❌ Fehler beim Laden der letzten Sync-Information:', err);
    }
  };

  const formatLastSync = (date: Date | null): string => {
    console.log('🕐 Formatting last sync date:', date);
    if (!date) return 'Noch nie geladen';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `vor ${diffMinutes} Minute${diffMinutes !== 1 ? 'n' : ''}`;
    } else if (diffHours < 24) {
      return `vor ${diffHours} Stunde${diffHours !== 1 ? 'n' : ''}`;
    } else if (diffDays < 7) {
      return `vor ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`;
    } else {
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Filter change handlers
  const handleFilterChange = (filterType: 'delivered' | 'cancelled' | 'overdue', checked: boolean) => {
    if (filterType === 'delivered') {
      setHideDelivered(checked);
      localStorage.setItem('hideDelivered', checked.toString());
    } else if (filterType === 'cancelled') {
      setHideCancelled(checked);
      localStorage.setItem('hideCancelled', checked.toString());
    } else if (filterType === 'overdue') {
      setHideOverdue(checked);
      localStorage.setItem('hideOverdue', checked.toString());
    }
  };

  const deleteTracking = async (id: number) => {
    if (!window.confirm('Sendung wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/packages/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        loadTrackings();
      } else {
        const data = await response.json();
        setError(data.message || 'Fehler beim Löschen');
      }
    } catch (err) {
      setError('Verbindungsfehler');
    }
  };

  const showDetails = (tracking: TrackingInfo) => {
    setSelectedTracking(tracking);
    setDetailsDialogOpen(true);
  };

  const getStatusColor = (status: string, isOverdue: boolean) => {
    if (isOverdue) return 'error';
    switch (status.toLowerCase()) {
      case 'zugestellt': return 'success';
      case 'unterwegs': return 'primary';
      case 'abholbereit': return 'warning';
      case 'storniert': 
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" component="h1">
            GLS Sendungsverfolgung
          </Typography>
          <SessionTimer 
            timeoutDuration={5 * 60 * 1000} // 5 Minuten
          />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<LoadIcon />}
            onClick={handleLoadFromGls}
            disabled={loading || loadingFromGls}
          >
            Vom GLS Portal laden
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Zuletzt geladen: {formatLastSync(lastGlsSync)}
          </Typography>
        </Box>
      </Box>

      {/* Filter Controls */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={() => setShowFilters(!showFilters)}
          sx={{ mb: showFilters ? 2 : 0 }}
        >
          Filter
        </Button>
        <Collapse in={showFilters}>
          <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Filter-Optionen
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={hideDelivered}
                    onChange={(e) => handleFilterChange('delivered', e.target.checked)}
                  />
                }
                label="Zugestellte ausblenden"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={hideCancelled}
                    onChange={(e) => handleFilterChange('cancelled', e.target.checked)}
                  />
                }
                label="Stornierte ausblenden"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={hideOverdue}
                    onChange={(e) => handleFilterChange('overdue', e.target.checked)}
                  />
                }
                label="Überfällige ausblenden"
              />
            </Box>
          </Paper>
        </Collapse>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Sendungsnummer</TableCell>
                <TableCell>Kunde</TableCell>
                <TableCell>Adressen</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Letzte Aktualisierung</TableCell>
                <TableCell align="center">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trackings
                .filter(tracking => {
                  if (hideCancelled && tracking.status === 'Storniert') return false;
                  if (hideDelivered && tracking.status === 'Zugestellt') return false;
                  if (hideOverdue && tracking.isOverdue) return false;
                  return true;
                })
                .sort((a, b) => {
                  // Sort by customer name first, then by tracking number
                  const customerCompare = a.customerName.localeCompare(b.customerName, 'de', { 
                    sensitivity: 'base',
                    numeric: true 
                  });
                  if (customerCompare !== 0) return customerCompare;
                  
                  // If same customer, sort by tracking number
                  return a.trackingNumber.localeCompare(b.trackingNumber);
                })
                .map((tracking, index) => {
                  // Get filtered and sorted customer trackings for counter
                  const allFilteredTrackings = trackings
                    .filter(t => 
                      !(hideCancelled && t.status === 'Storniert') &&
                      !(hideDelivered && t.status === 'Zugestellt') &&
                      !(hideOverdue && t.isOverdue)
                    )
                    .sort((a, b) => {
                      const customerCompare = a.customerName.localeCompare(b.customerName, 'de', { 
                        sensitivity: 'base',
                        numeric: true 
                      });
                      if (customerCompare !== 0) return customerCompare;
                      return a.trackingNumber.localeCompare(b.trackingNumber);
                    });

                  const customerTrackings = allFilteredTrackings.filter(t => 
                    t.customerName === tracking.customerName
                  );
                  
                  const customerDisplayName = customerTrackings.length > 1 
                    ? `${tracking.customerName} (${customerTrackings.findIndex(t => t.id === tracking.id) + 1}/${customerTrackings.length})`
                    : tracking.customerName;

                  return (
                <TableRow 
                  key={tracking.id}
                  sx={{
                    backgroundColor: tracking.isOverdue ? 'rgba(211, 47, 47, 0.08)' : 'inherit',
                    '&:hover': {
                      backgroundColor: tracking.isOverdue ? 'rgba(211, 47, 47, 0.12)' : 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {tracking.trackingNumber}
                      {tracking.isOverdue && (
                        <Tooltip title="Überfällig (älter als 5 Tage)">
                          <WarningIcon color="error" sx={{ ml: 1 }} />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{customerDisplayName}</TableCell>
                  <TableCell>{tracking.address || 'Unbekannt'}</TableCell>
                  <TableCell>
                    <Chip
                      label={tracking.status}
                      color={getStatusColor(tracking.status, tracking.isOverdue)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {tracking.lastUpdate ? formatDate(tracking.lastUpdate) : 'Nie'}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => showDetails(tracking)}
                        title="Details anzeigen"
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => deleteTracking(tracking.id)}
                        title="Löschen"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
                  );
                })}
              {trackings.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Keine Sendungen vorhanden
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {loading && <LinearProgress />}
      </Paper>

      {/* Master Password Dialog */}
      <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Master-Passwort eingeben</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Bitte geben Sie Ihr Master-Passwort ein, um Sendungen vom GLS Portal zu laden.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Master-Passwort"
            type="password"
            fullWidth
            variant="outlined"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(false)}>Abbrechen</Button>
          <Button onClick={confirmLoadFromGls} variant="contained" disabled={loadingFromGls}>
            Laden
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Sendungsdetails: {selectedTracking?.trackingNumber}
        </DialogTitle>
        <DialogContent>
          {selectedTracking && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Allgemeine Informationen
              </Typography>
              <Typography><strong>Kunde:</strong> {selectedTracking.customerName}</Typography>
              <Typography><strong>Status:</strong> {selectedTracking.status}</Typography>
              <Typography><strong>Adressen:</strong> {selectedTracking.address}</Typography>
              <Typography>
                <strong>Letzte Aktualisierung:</strong>{' '}
                {selectedTracking.lastUpdate ? formatDate(selectedTracking.lastUpdate) : 'Nie'}
              </Typography>

              {selectedTracking.trackingEvents.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                    Sendungsverlauf
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Datum</TableCell>
                          <TableCell>Zeit</TableCell>
                          <TableCell>Beschreibung</TableCell>
                          <TableCell>Standort</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedTracking.trackingEvents.map((event, index) => (
                          <TableRow key={index}>
                            <TableCell>{event.date}</TableCell>
                            <TableCell>{event.time}</TableCell>
                            <TableCell>{event.description}</TableCell>
                            <TableCell>{event.location}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;
