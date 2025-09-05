import express from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { glsService } from '../services/glsService';
import { EncryptionService } from '../services/encryptionService';

const router = express.Router();
const prisma = new PrismaClient();

// Auth middleware
const authMiddleware = (req: any, res: any, next: any) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    }

    jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Ungültiges Token' });
  }
};

// Validation schemas
const addTrackingSchema = Joi.object({
  trackingNumber: Joi.string().required(),
  customerName: Joi.string().required()
});

// Get all trackings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { hideDelivered, hideCancelled } = req.query;
    
    // Build filter conditions
    const whereConditions: any = {};
    
    if (hideDelivered === 'true' || hideCancelled === 'true') {
      if (hideDelivered === 'true' && hideCancelled === 'true') {
        // Hide both delivered and cancelled
        whereConditions.AND = [
          { NOT: { status: { contains: 'zugestellt' } } },
          { NOT: { status: { contains: 'delivered' } } },
          { NOT: { status: { contains: 'Zugestellt' } } },
          { NOT: { status: { contains: 'ZUGESTELLT' } } },
          { NOT: { status: { contains: 'storniert' } } },
          { NOT: { status: { contains: 'cancelled' } } },
          { NOT: { status: { contains: 'Storniert' } } },
          { NOT: { status: { contains: 'STORNIERT' } } }
        ];
      } else if (hideDelivered === 'true') {
        // Hide only delivered
        whereConditions.AND = [
          { NOT: { status: { contains: 'zugestellt' } } },
          { NOT: { status: { contains: 'delivered' } } },
          { NOT: { status: { contains: 'Zugestellt' } } },
          { NOT: { status: { contains: 'ZUGESTELLT' } } }
        ];
      } else if (hideCancelled === 'true') {
        // Hide only cancelled
        whereConditions.AND = [
          { NOT: { status: { contains: 'storniert' } } },
          { NOT: { status: { contains: 'cancelled' } } },
          { NOT: { status: { contains: 'Storniert' } } },
          { NOT: { status: { contains: 'STORNIERT' } } }
        ];
      }
    }

    const trackings = await prisma.trackingInfo.findMany({
      where: whereConditions,
      include: {
        trackingEvents: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Check for overdue packages (older than 5 days and not delivered/cancelled)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const trackingsWithOverdue = trackings.map((tracking: any) => {
      // Check if package is older than 5 days and not delivered or cancelled
      const isOlderThan5Days = new Date(tracking.createdAt) < fiveDaysAgo;
      const isNotDeliveredOrCancelled = 
        !tracking.status.toLowerCase().includes('zugestellt') && 
        !tracking.status.toLowerCase().includes('storniert') &&
        !tracking.status.toLowerCase().includes('cancelled');
      
      return {
        ...tracking,
        isOverdue: isOlderThan5Days && isNotDeliveredOrCancelled
      };
    });

    res.json({ success: true, data: trackingsWithOverdue });
  } catch (error: any) {
    console.error('Get trackings error:', error);
    res.status(500).json({ success: false, message: 'Interner Server-Fehler' });
  }
});

// Add new tracking
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { error, value } = addTrackingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { trackingNumber, customerName } = value;

    // Check if tracking already exists
    const existingTracking = await prisma.trackingInfo.findUnique({
      where: { trackingNumber }
    });

    if (existingTracking) {
      return res.status(400).json({ 
        success: false, 
        message: 'Sendungsnummer bereits vorhanden' 
      });
    }

    // Create tracking entry
    const tracking = await prisma.trackingInfo.create({
      data: {
        trackingNumber,
        customerName,
        status: 'Ausstehend',
        location: 'Unbekannt'
      }
    });

    res.json({ success: true, data: tracking });
  } catch (error: any) {
    console.error('Add tracking error:', error);
    res.status(500).json({ success: false, message: 'Interner Server-Fehler' });
  }
});

// Update tracking (manual refresh)
router.put('/:id', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params;
    const trackingId = parseInt(id);

    const tracking = await prisma.trackingInfo.findUnique({
      where: { id: trackingId }
    });

    if (!tracking) {
      return res.status(404).json({ success: false, message: 'Sendung nicht gefunden' });
    }

    // Get encrypted GLS credentials
    const config = await prisma.appConfig.findFirst();
    if (!config?.glsUsernameEnc || !config?.glsPasswordEnc) {
      return res.status(400).json({ 
        success: false, 
        message: 'GLS Zugangsdaten nicht konfiguriert' 
      });
    }

    // Get master password from request
    const { masterPassword } = req.body;
    if (!masterPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Master Password erforderlich für GLS Zugriff' 
      });
    }

    try {
      // Decrypt GLS credentials
      const glsUsername = await EncryptionService.decrypt(config.glsUsernameEnc, masterPassword);
      const glsPassword = await EncryptionService.decrypt(config.glsPasswordEnc, masterPassword);

      // Login to GLS and track package
      const loginSuccess = await glsService.login(glsUsername, glsPassword, (step, message, progress) => {
        // Could emit progress via WebSocket here
        console.log(`${step}: ${message} (${progress}%)`);
      });

      if (!loginSuccess) {
        return res.status(400).json({ 
          success: false, 
          message: 'GLS Anmeldung fehlgeschlagen' 
        });
      }

      const trackingResult = await glsService.trackPackage(tracking.trackingNumber, (step, message, progress) => {
        console.log(`${step}: ${message} (${progress}%)`);
      });

      // Update tracking info in database
      const updatedTracking = await prisma.trackingInfo.update({
        where: { id: trackingId },
        data: {
          status: trackingResult.status,
          location: trackingResult.location,
          lastUpdate: trackingResult.lastUpdate || new Date(),
          isOverdue: false
        }
      });

      // Save tracking events
      for (const event of trackingResult.events) {
        await prisma.trackingEvent.create({
          data: {
            trackingId: trackingId,
            date: event.date,
            time: event.time,
            description: event.description,
            location: event.location
          }
        });
      }

      // Get updated tracking with events
      const finalTracking = await prisma.trackingInfo.findUnique({
        where: { id: trackingId },
        include: {
          trackingEvents: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      res.json({ success: true, data: finalTracking });

    } catch (decryptError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ungültiges Master Password oder Entschlüsselungsfehler' 
      });
    }

  } catch (error: any) {
    console.error('Update tracking error:', error);
    res.status(500).json({ success: false, message: 'Interner Server-Fehler' });
  }
});

// Delete tracking
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const trackingId = parseInt(id);

    const tracking = await prisma.trackingInfo.findUnique({
      where: { id: trackingId }
    });

    if (!tracking) {
      return res.status(404).json({ success: false, message: 'Sendung nicht gefunden' });
    }

    await prisma.trackingInfo.delete({
      where: { id: trackingId }
    });

    res.json({ success: true, message: 'Sendung erfolgreich gelöscht' });
  } catch (error: any) {
    console.error('Delete tracking error:', error);
    res.status(500).json({ success: false, message: 'Interner Server-Fehler' });
  }
});

export default router;
