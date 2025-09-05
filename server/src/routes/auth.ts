import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import { EncryptionService } from '../services/encryptionService';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const setupSchema = Joi.object({
  masterPassword: Joi.string().min(8).required(),
  glsUsername: Joi.string().required(),
  glsPassword: Joi.string().required()
});

const loginSchema = Joi.object({
  masterPassword: Joi.string().required()
});

const glsCredentialsSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

// Check if app is setup
router.get('/status', async (req, res) => {
  try {
    const config = await prisma.appConfig.findFirst();
    const isFirstRun = !config || config.isFirstRun;
    
    res.json({
      success: true,
      data: {
        isFirstRun,
        hasGlsCredentials: config?.glsUsernameEnc ? true : false
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Setup master password (first run)
router.post('/setup', async (req, res) => {
  try {
    const { error, value } = setupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { masterPassword, glsUsername, glsPassword } = value;

    // Check if already setup
    const config = await prisma.appConfig.findFirst();
    if (config && !config.isFirstRun) {
      return res.status(400).json({ success: false, message: 'App bereits eingerichtet' });
    }

    // Hash master password
    const { hash, salt } = await EncryptionService.hashPassword(masterPassword);

    // Encrypt GLS credentials
    const encryptedGlsUsername = await EncryptionService.encrypt(glsUsername, masterPassword);
    const encryptedGlsPassword = await EncryptionService.encrypt(glsPassword, masterPassword);

    // Save to database
    await prisma.appConfig.upsert({
      where: { id: 1 },
      update: {
        masterPasswordHash: hash,
        masterPasswordSalt: salt,
        glsUsernameEnc: encryptedGlsUsername,
        glsPasswordEnc: encryptedGlsPassword,
        isFirstRun: false
      },
      create: {
        masterPasswordHash: hash,
        masterPasswordSalt: salt,
        glsUsernameEnc: encryptedGlsUsername,
        glsPasswordEnc: encryptedGlsPassword,
        isFirstRun: false
      }
    });

    res.json({ success: true, message: 'Setup erfolgreich abgeschlossen' });
  } catch (error: any) {
    console.error('Setup error:', error);
    res.status(500).json({ success: false, message: 'Interner Server-Fehler' });
  }
});

// Login with master password
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { masterPassword } = value;

    const config = await prisma.appConfig.findFirst();
    if (!config) {
      return res.status(400).json({ success: false, message: 'App nicht eingerichtet' });
    }

    // Verify password
    const isValid = await EncryptionService.verifyPassword(
      masterPassword,
      config.masterPasswordHash,
      config.masterPasswordSalt
    );

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Ungültiges Master Password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { authenticated: true, timestamp: Date.now() },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({ 
      success: true, 
      message: 'Anmeldung erfolgreich',
      data: {
        token,
        hasGlsCredentials: config.glsUsernameEnc ? true : false
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Interner Server-Fehler' });
  }
});

// Save GLS credentials (encrypted)
router.post('/gls-credentials', async (req: any, res) => {
  try {
    // Verify authentication
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    }

    jwt.verify(token, process.env.JWT_SECRET!);

    const { error, value } = glsCredentialsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { username, password } = value;

    // Get master password from request (should be included for encryption)
    const { masterPassword } = req.body;
    if (!masterPassword) {
      return res.status(400).json({ success: false, message: 'Master Password erforderlich' });
    }

    // Encrypt credentials
    const encryptedUsername = await EncryptionService.encrypt(username, masterPassword);
    const encryptedPassword = await EncryptionService.encrypt(password, masterPassword);

    // Save encrypted credentials
    await prisma.appConfig.update({
      where: { id: 1 },
      data: {
        glsUsernameEnc: encryptedUsername,
        glsPasswordEnc: encryptedPassword
      }
    });

    res.json({ success: true, message: 'GLS Zugangsdaten erfolgreich gespeichert' });
  } catch (error: any) {
    console.error('Save credentials error:', error);
    res.status(500).json({ success: false, message: 'Interner Server-Fehler' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Erfolgreich abgemeldet' });
});

export default router;
