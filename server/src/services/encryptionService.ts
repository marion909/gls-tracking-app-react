import crypto from 'crypto';
import { promisify } from 'util';

const pbkdf2 = promisify(crypto.pbkdf2);

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-cbc';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 32;
  private static readonly ITERATIONS = 10000;

  // Generate encryption key from master password
  static async deriveKey(masterPassword: string, salt: Buffer): Promise<Buffer> {
    return await pbkdf2(masterPassword, salt, this.ITERATIONS, this.KEY_LENGTH, 'sha256');
  }

  // Encrypt data
  static async encrypt(data: string, masterPassword: string): Promise<string> {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      const iv = crypto.randomBytes(this.IV_LENGTH);

      // Derive key from master password
      const key = await this.deriveKey(masterPassword, salt);

      // Encrypt data
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
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
    } catch (error: any) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  // Decrypt data
  static async decrypt(encryptedData: string, masterPassword: string): Promise<string> {
    try {
      // Parse encrypted data
      const parsed = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
      const salt = Buffer.from(parsed.salt, 'hex');
      const iv = Buffer.from(parsed.iv, 'hex');

      // Derive key from master password
      const key = await this.deriveKey(masterPassword, salt);

      // Decrypt data
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAutoPadding(true);

      let decrypted = decipher.update(parsed.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  // Hash password with PBKDF2
  static async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const hash = await pbkdf2(password, salt, this.ITERATIONS, this.KEY_LENGTH, 'sha256');

    return {
      hash: hash.toString('hex'),
      salt: salt.toString('hex')
    };
  }

  // Verify password
  static async verifyPassword(
    password: string,
    storedHash: string,
    storedSalt: string
  ): Promise<boolean> {
    const salt = Buffer.from(storedSalt, 'hex');
    const hash = await pbkdf2(password, salt, this.ITERATIONS, this.KEY_LENGTH, 'sha256');

    return hash.toString('hex') === storedHash;
  }
}
