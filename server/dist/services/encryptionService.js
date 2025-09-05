"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const util_1 = require("util");
const pbkdf2 = (0, util_1.promisify)(crypto_1.default.pbkdf2);
class EncryptionService {
    // Generate encryption key from master password
    static async deriveKey(masterPassword, salt) {
        return await pbkdf2(masterPassword, salt, this.ITERATIONS, this.KEY_LENGTH, 'sha256');
    }
    // Encrypt data
    static async encrypt(data, masterPassword) {
        try {
            // Generate random salt and IV
            const salt = crypto_1.default.randomBytes(this.SALT_LENGTH);
            const iv = crypto_1.default.randomBytes(this.IV_LENGTH);
            // Derive key from master password
            const key = await this.deriveKey(masterPassword, salt);
            // Encrypt data
            const cipher = crypto_1.default.createCipher(this.ALGORITHM, key);
            cipher.setAutoPadding(true);
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            // Combine salt + iv + encrypted data
            const result = {
                salt: salt.toString('hex'),
                iv: iv.toString('hex'),
                data: encrypted
            };
            return Buffer.from(JSON.stringify(result)).toString('base64');
        }
        catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }
    // Decrypt data
    static async decrypt(encryptedData, masterPassword) {
        try {
            // Parse encrypted data
            const parsed = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
            const salt = Buffer.from(parsed.salt, 'hex');
            const iv = Buffer.from(parsed.iv, 'hex');
            // Derive key from master password
            const key = await this.deriveKey(masterPassword, salt);
            // Decrypt data
            const decipher = crypto_1.default.createDecipher(this.ALGORITHM, key);
            decipher.setAutoPadding(true);
            let decrypted = decipher.update(parsed.data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
    // Hash password with PBKDF2
    static async hashPassword(password) {
        const salt = crypto_1.default.randomBytes(this.SALT_LENGTH);
        const hash = await pbkdf2(password, salt, this.ITERATIONS, this.KEY_LENGTH, 'sha256');
        return {
            hash: hash.toString('hex'),
            salt: salt.toString('hex')
        };
    }
    // Verify password
    static async verifyPassword(password, storedHash, storedSalt) {
        const salt = Buffer.from(storedSalt, 'hex');
        const hash = await pbkdf2(password, salt, this.ITERATIONS, this.KEY_LENGTH, 'sha256');
        return hash.toString('hex') === storedHash;
    }
}
exports.EncryptionService = EncryptionService;
EncryptionService.ALGORITHM = 'aes-256-cbc';
EncryptionService.KEY_LENGTH = 32;
EncryptionService.IV_LENGTH = 16;
EncryptionService.SALT_LENGTH = 32;
EncryptionService.ITERATIONS = 10000;
//# sourceMappingURL=encryptionService.js.map