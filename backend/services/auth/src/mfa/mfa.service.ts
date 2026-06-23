import { Injectable, Logger } from '@nestjs/common';
import { EncryptionService } from '@adbar/common';
import * as crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const speakeasy: any = {};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const QRCode: any = {};

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly issuer: string;

  constructor(private readonly encryptionService: EncryptionService) {
    this.issuer = 'Adbar';
  }

  /**
   * Generate a new TOTP secret for a user
   */
  async generateSecret(email: string): Promise<{
    secret: string;
    base32: string;
    otpauthUrl: string;
    encryptedSecret: string;
  }> {
    const secret = speakeasy.generateSecret({
      name: `${this.issuer}:${email}`,
      issuer: this.issuer,
      length: 32,
    });

    const otpauthUrl = secret.otpauth_url || '';
    const base32 = secret.base32;

    // Encrypt the secret before storing
    const encryptedSecret = this.encryptionService.encrypt(base32);

    return {
      secret: base32,
      base32,
      otpauthUrl,
      encryptedSecret,
    };
  }

  /**
   * Generate a QR code data URL for the TOTP secret
   */
  async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      this.logger.error('Failed to generate QR code', error as string);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify a TOTP token against a stored secret
   */
  async verifyToken(encryptedSecret: string, token: string): Promise<boolean> {
    try {
      const secret = this.encryptionService.decrypt(encryptedSecret);

      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1, // Allow 1 step tolerance (30 seconds before/after);
      });
    } catch (error) {
      this.logger.error('MFA token verification failed', error as string);
      return false;
    }
  }

  /**
   * Generate a TOTP token (for testing purposes)
   */
  generateToken(secret: string): string {
    return speakeasy.totp({
      secret,
      encoding: 'base32',
    });
  }

  /**
   * Generate backup codes for MFA recovery
   */
  async generateBackupCodes(count: number = 10): Promise<{
    plainCodes: string[];
    hashedCodes: string[];
  }> {
    const plainCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
      plainCodes.push(formatted);
      hashedCodes.push(this.encryptionService.hash(formatted));
    }

    return { plainCodes, hashedCodes };
  }

  /**
   * Verify a backup code
   */
  verifyBackupCode(code: string, hashedCodes: string[]): boolean {
    const codeHash = this.encryptionService.hash(code);
    return hashedCodes.includes(codeHash);
  }
}
