"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const joi_1 = __importDefault(require("joi"));
const encryptionService_1 = require("../services/encryptionService");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Validation schemas
const setupSchema = joi_1.default.object({
    masterPassword: joi_1.default.string().min(8).required(),
    glsUsername: joi_1.default.string().required(),
    glsPassword: joi_1.default.string().required()
});
const loginSchema = joi_1.default.object({
    masterPassword: joi_1.default.string().required()
});
const glsCredentialsSchema = joi_1.default.object({
    username: joi_1.default.string().required(),
    password: joi_1.default.string().required()
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
    }
    catch (error) {
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
        const { hash, salt } = await encryptionService_1.EncryptionService.hashPassword(masterPassword);
        // Encrypt GLS credentials
        const encryptedGlsUsername = await encryptionService_1.EncryptionService.encrypt(glsUsername, masterPassword);
        const encryptedGlsPassword = await encryptionService_1.EncryptionService.encrypt(glsPassword, masterPassword);
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
    }
    catch (error) {
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
        const isValid = await encryptionService_1.EncryptionService.verifyPassword(masterPassword, config.masterPasswordHash, config.masterPasswordSalt);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Ungültiges Master Password' });
        }
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ authenticated: true, timestamp: Date.now() }, process.env.JWT_SECRET, { expiresIn: '24h' });
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
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Interner Server-Fehler' });
    }
});
// Save GLS credentials (encrypted)
router.post('/gls-credentials', async (req, res) => {
    try {
        // Verify authentication
        const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
        }
        jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
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
        const encryptedUsername = await encryptionService_1.EncryptionService.encrypt(username, masterPassword);
        const encryptedPassword = await encryptionService_1.EncryptionService.encrypt(password, masterPassword);
        // Save encrypted credentials
        await prisma.appConfig.update({
            where: { id: 1 },
            data: {
                glsUsernameEnc: encryptedUsername,
                glsPasswordEnc: encryptedPassword
            }
        });
        res.json({ success: true, message: 'GLS Zugangsdaten erfolgreich gespeichert' });
    }
    catch (error) {
        console.error('Save credentials error:', error);
        res.status(500).json({ success: false, message: 'Interner Server-Fehler' });
    }
});
// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Erfolgreich abgemeldet' });
});
exports.default = router;
//# sourceMappingURL=auth.js.map