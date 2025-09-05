import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { glsService, ShipmentSummary } from '../services/glsService';
import { EncryptionService } from '../services/encryptionService';

const router = express.Router();
const prisma = new PrismaClient();

// Import socket service instance
let socketServiceInstance: any = null;
const getSocketService = () => {
  if (!socketServiceInstance) {
    // Direct require to avoid circular dependency
    const { socketService } = require('../index');
    socketServiceInstance = socketService;
  }
  return socketServiceInstance;
};

// Middleware to verify authentication
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    console.log('🔒 Authentifizierung fehlgeschlagen: Kein Token vorhanden');
    return res.status(401).json({ 
      success: false, 
      message: 'Nicht authentifiziert',
      code: 'NO_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Zusätzliche Token-Validierung
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      console.log('🔒 Token abgelaufen:', { 
        expired: decoded.exp, 
        now: now, 
        diff: now - decoded.exp 
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Token abgelaufen',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    console.log('✅ Token gültig für Request:', req.originalUrl);
    req.user = decoded;
    next();
  } catch (error: any) {
    console.log('🔒 Token Validierung fehlgeschlagen:', error.message);
    return res.status(401).json({ 
      success: false, 
      message: 'Ungültiger Token',
      code: 'INVALID_TOKEN'
    });
  }
};

// Load all shipments from GLS portal
router.post('/load-from-gls', authenticateToken, async (req: any, res) => {
  try {
    const { masterPassword } = req.body;

    if (!masterPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Master Password erforderlich' 
      });
    }

    // Get encrypted GLS credentials
    const config = await prisma.appConfig.findFirst();
    if (!config || !config.glsUsernameEnc || !config.glsPasswordEnc) {
      return res.status(400).json({ 
        success: false, 
        message: 'GLS Zugangsdaten nicht konfiguriert' 
      });
    }

    // Verify master password
    const isValidPassword = await EncryptionService.verifyPassword(
      masterPassword,
      config.masterPasswordHash,
      config.masterPasswordSalt
    );

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Ungültiges Master Password' 
      });
    }

    // Decrypt GLS credentials
    const glsUsername = await EncryptionService.decrypt(config.glsUsernameEnc, masterPassword);
    const glsPassword = await EncryptionService.decrypt(config.glsPasswordEnc, masterPassword);

    // Setup progress callback for real-time updates
    const progressCallback = (step: string, message: string, progress: number) => {
      console.log(`🔄 Progress Update: ${step} - ${message} (${progress}%)`);
      try {
        const socketService = getSocketService();
        if (socketService) {
          socketService.emitProgress(step, message, progress);
          console.log(`✅ Progress emitted via Socket.IO: ${progress}%`);
        } else {
          console.log('❌ Socket service not available');
        }
      } catch (error) {
        console.log(`❌ Error emitting progress: ${error}`);
      }
    };

    // Login to GLS and load shipments
    progressCallback('login', 'Anmeldung bei GLS Portal...', 5);
    
    const loginSuccess = await glsService.login(glsUsername, glsPassword, progressCallback);
    if (!loginSuccess) {
      return res.status(400).json({ 
        success: false, 
        message: 'GLS Anmeldung fehlgeschlagen' 
      });
    }

    // Load all shipments
    const shipments = await glsService.loadAllShipments(progressCallback);

    // Save shipments to database
    progressCallback('saving', 'Sendungen werden in Datenbank gespeichert...', 95);

    for (const shipment of shipments) {
      await prisma.trackingInfo.upsert({
        where: { trackingNumber: shipment.trackingNumber },
        update: {
          customerName: shipment.customerName,
          status: shipment.status,
          address: shipment.address,
          lastUpdate: shipment.lastUpdate,
          isOverdue: shipment.isOverdue,
          updatedAt: new Date()
        },
        create: {
          trackingNumber: shipment.trackingNumber,
          customerName: shipment.customerName,
          status: shipment.status,
          address: shipment.address,
          lastUpdate: shipment.lastUpdate,
          isOverdue: shipment.isOverdue
        }
      });
    }

    // Cleanup
    await glsService.quit();

    // Update lastGlsSync timestamp
    const syncTimestamp = new Date();
    console.log('📅 Updating lastGlsSync to:', syncTimestamp);
    
    await prisma.appConfig.update({
      where: { id: config.id },
      data: { 
        lastGlsSync: syncTimestamp,
        updatedAt: syncTimestamp
      }
    });
    
    console.log('✅ LastGlsSync updated successfully');

    progressCallback('complete', `${shipments.length} Sendungen erfolgreich geladen und gespeichert`, 100);

    res.json({ 
      success: true, 
      message: `${shipments.length} Sendungen erfolgreich geladen`,
      data: {
        count: shipments.length,
        shipments: shipments,
        lastSync: syncTimestamp
      }
    });

  } catch (error: any) {
    console.error('Load shipments error:', error);
    
    // Cleanup on error
    try {
      await glsService.quit();
    } catch {}

    // Emit error via socket
    getSocketService().emitProgress('error', `Fehler beim Laden: ${error.message}`, 0);

    res.status(500).json({ 
      success: false, 
      message: `Laden der Sendungen fehlgeschlagen: ${error.message}` 
    });
  }
});

// Get all shipments from database
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { hideDelivered, hideCancelled } = req.query;

    // Build filter conditions
    const whereConditions: any = {};
    
    if (hideDelivered === 'true') {
      whereConditions.status = {
        not: {
          contains: 'zugestellt'
        }
      };
    }
    
    if (hideCancelled === 'true') {
      // Add cancelled filter to existing conditions
      if (whereConditions.status) {
        whereConditions.AND = [
          whereConditions,
          {
            status: {
              not: {
                contains: 'storniert'
              }
            }
          }
        ];
        delete whereConditions.status;
      } else {
        whereConditions.status = {
          not: {
            contains: 'storniert'
          }
        };
      }
    }
    
    // If both filters are active, combine them
    if (hideDelivered === 'true' && hideCancelled === 'true') {
      whereConditions.AND = [
        {
          status: {
            not: {
              contains: 'zugestellt'
            }
          }
        },
        {
          status: {
            not: {
              contains: 'storniert'
            }
          }
        }
      ];
      delete whereConditions.status;
    }

    const shipments = await prisma.trackingInfo.findMany({
      where: whereConditions,
      orderBy: [
        { isOverdue: 'desc' }, // Overdue first
        { lastUpdate: 'desc' } // Then by most recent
      ],
      include: {
        trackingEvents: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Calculate isOverdue based on creation date and status
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const shipmentsWithOverdue = shipments.map((shipment: any) => {
      // Check if package is older than 5 days and not delivered or cancelled
      const isOlderThan5Days = new Date(shipment.createdAt) < fiveDaysAgo;
      const isNotDeliveredOrCancelled = 
        !shipment.status.toLowerCase().includes('zugestellt') && 
        !shipment.status.toLowerCase().includes('storniert') &&
        !shipment.status.toLowerCase().includes('cancelled');
      
      return {
        ...shipment,
        isOverdue: isOlderThan5Days && isNotDeliveredOrCancelled
      };
    });

    res.json({
      success: true,
      data: shipmentsWithOverdue
    });

  } catch (error: any) {
    console.error('Get shipments error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Laden der Sendungen' 
    });
  }
});

// Get last sync information
router.get('/last-sync', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Getting last sync information...');
    const config = await prisma.appConfig.findFirst();
    
    console.log('📊 Config found:', { 
      id: config?.id, 
      lastGlsSync: config?.lastGlsSync 
    });
    
    res.json({
      success: true,
      data: {
        lastSync: config?.lastGlsSync || null
      }
    });

  } catch (error: any) {
    console.error('❌ Get last sync error:', error);
    res.status(500).json({
      success: false,
      message: `Fehler beim Abrufen der Sync-Information: ${error.message}`
    });
  }
});

// Get single shipment details
router.get('/:trackingNumber', authenticateToken, async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const shipment = await prisma.trackingInfo.findUnique({
      where: { trackingNumber },
      include: {
        trackingEvents: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Sendung nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: shipment
    });

  } catch (error: any) {
    console.error('Get shipment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Laden der Sendung' 
    });
  }
});

// Update single shipment from GLS
router.post('/:trackingNumber/update', authenticateToken, async (req: any, res) => {
  try {
    const { trackingNumber } = req.params;
    const { masterPassword } = req.body;

    if (!masterPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Master Password erforderlich' 
      });
    }

    // Get encrypted GLS credentials
    const config = await prisma.appConfig.findFirst();
    if (!config || !config.glsUsernameEnc || !config.glsPasswordEnc) {
      return res.status(400).json({ 
        success: false, 
        message: 'GLS Zugangsdaten nicht konfiguriert' 
      });
    }

    // Verify master password
    const isValidPassword = await EncryptionService.verifyPassword(
      masterPassword,
      config.masterPasswordHash,
      config.masterPasswordSalt
    );

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Ungültiges Master Password' 
      });
    }

    // Decrypt GLS credentials
    const glsUsername = await EncryptionService.decrypt(config.glsUsernameEnc, masterPassword);
    const glsPassword = await EncryptionService.decrypt(config.glsPasswordEnc, masterPassword);

    // Setup progress callback
    const progressCallback = (step: string, message: string, progress: number) => {
      getSocketService().emitProgress(step, message, progress);
    };

    // Login and track specific package
    const loginSuccess = await glsService.login(glsUsername, glsPassword, progressCallback);
    if (!loginSuccess) {
      return res.status(400).json({ 
        success: false, 
        message: 'GLS Anmeldung fehlgeschlagen' 
      });
    }

    const trackingResult = await glsService.trackPackage(trackingNumber, progressCallback);

    // Calculate isOverdue based on creation date and status for both update and create
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    // Save updated tracking info
    const updatedShipment = await prisma.trackingInfo.upsert({
      where: { trackingNumber },
      update: {
        status: trackingResult.status,
        address: trackingResult.address,
        lastUpdate: trackingResult.lastUpdate,
        isOverdue: false, // Will be calculated after retrieval
        updatedAt: new Date()
      },
      create: {
        trackingNumber,
        customerName: 'Unbekannt',
        status: trackingResult.status,
        address: trackingResult.address,
        lastUpdate: trackingResult.lastUpdate,
        isOverdue: false // Will be calculated after retrieval
      },
      include: {
        trackingEvents: true
      }
    });

    // Calculate correct isOverdue based on creation date and status
    const isOlderThan5Days = new Date(updatedShipment.createdAt) < fiveDaysAgo;
    const isNotDeliveredOrCancelled = 
      !updatedShipment.status.toLowerCase().includes('zugestellt') && 
      !updatedShipment.status.toLowerCase().includes('storniert') &&
      !updatedShipment.status.toLowerCase().includes('cancelled');
    
    const shipmentWithCorrectOverdue = {
      ...updatedShipment,
      isOverdue: isOlderThan5Days && isNotDeliveredOrCancelled
    };

    // Save tracking events
    for (const event of trackingResult.events) {
      await prisma.trackingEvent.upsert({
        where: {
          trackingId_date_time: {
            trackingId: shipmentWithCorrectOverdue.id,
            date: event.date,
            time: event.time
          }
        },
        update: {
          description: event.description,
          location: event.location
        },
        create: {
          trackingId: shipmentWithCorrectOverdue.id,
          date: event.date,
          time: event.time,
          description: event.description,
          location: event.location
        }
      });
    }

    // Cleanup
    await glsService.quit();

    res.json({
      success: true,
      message: 'Sendung erfolgreich aktualisiert',
      data: shipmentWithCorrectOverdue
    });

  } catch (error: any) {
    console.error('Update shipment error:', error);
    
    try {
      await glsService.quit();
    } catch {}

    getSocketService().emitProgress('error', `Fehler beim Aktualisieren: ${error.message}`, 0);

    res.status(500).json({ 
      success: false, 
      message: `Aktualisierung fehlgeschlagen: ${error.message}` 
    });
  }
});

export default router;
