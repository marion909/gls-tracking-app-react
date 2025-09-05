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
    // Lazy load to avoid circular dependency
    socketServiceInstance = require('../index').socketService;
  }
  return socketServiceInstance;
};

// Middleware to verify authentication
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Ungültiger Token' });
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
      getSocketService().emitProgress(step, message, progress);
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
          location: shipment.location,
          lastUpdate: shipment.lastUpdate,
          isOverdue: shipment.isOverdue,
          updatedAt: new Date()
        },
        create: {
          trackingNumber: shipment.trackingNumber,
          customerName: shipment.customerName,
          status: shipment.status,
          location: shipment.location,
          lastUpdate: shipment.lastUpdate,
          isOverdue: shipment.isOverdue
        }
      });
    }

    // Cleanup
    await glsService.quit();

    progressCallback('complete', `${shipments.length} Sendungen erfolgreich geladen und gespeichert`, 100);

    res.json({ 
      success: true, 
      message: `${shipments.length} Sendungen erfolgreich geladen`,
      data: {
        count: shipments.length,
        shipments: shipments
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

    res.json({
      success: true,
      data: shipments
    });

  } catch (error: any) {
    console.error('Get shipments error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Laden der Sendungen' 
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

    // Save updated tracking info
    const updatedShipment = await prisma.trackingInfo.upsert({
      where: { trackingNumber },
      update: {
        status: trackingResult.status,
        location: trackingResult.location,
        lastUpdate: trackingResult.lastUpdate,
        isOverdue: trackingResult.lastUpdate ? 
          (Date.now() - trackingResult.lastUpdate.getTime()) > (7 * 24 * 60 * 60 * 1000) : false,
        updatedAt: new Date()
      },
      create: {
        trackingNumber,
        customerName: 'Unbekannt',
        status: trackingResult.status,
        location: trackingResult.location,
        lastUpdate: trackingResult.lastUpdate,
        isOverdue: trackingResult.lastUpdate ? 
          (Date.now() - trackingResult.lastUpdate.getTime()) > (7 * 24 * 60 * 60 * 1000) : false
      },
      include: {
        trackingEvents: true
      }
    });

    // Save tracking events
    for (const event of trackingResult.events) {
      await prisma.trackingEvent.upsert({
        where: {
          trackingId_date_time: {
            trackingId: updatedShipment.id,
            date: event.date,
            time: event.time
          }
        },
        update: {
          description: event.description,
          location: event.location
        },
        create: {
          trackingId: updatedShipment.id,
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
      data: updatedShipment
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
