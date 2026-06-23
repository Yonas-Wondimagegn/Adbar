import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private readonly saltLength = 64;
  private readonly tagLength = 16;
  private readonly keyLength = 32;
  private readonly iterations = 100000;

  constructor() {
    if (!process.env['ENCRYPTION_KEY']) {
      this.logger.warn('ENCRYPTION_KEY not set. Using default development key.');
    }
  }

  private getKey(): string {
    return process.env['ENCRYPTION_KEY'] ?? 'dev-only-key-do-not-use-in-production-32b';
  }

  encrypt(plainText: string): string {
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);
    const key = crypto.pbkdf2Sync(
      this.getKey(),
      salt,
      this.iterations,
      this.keyLength,
      'sha512',
    );

    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
  }

  decrypt(encryptedText: string): string {
    const buffer = Buffer.from(encryptedText, 'base64');
    const salt = buffer.subarray(0, this.saltLength);
    const iv = buffer.subarray(this.saltLength, this.saltLength + this.ivLength);
    const tag = buffer.subarray(
      this.saltLength + this.ivLength,
      this.saltLength + this.ivLength + this.tagLength,
    );
    const encrypted = buffer.subarray(
      this.saltLength + this.ivLength + this.tagLength,
    );

    const key = crypto.pbkdf2Sync(
      this.getKey(),
      salt,
      this.iterations,
      this.keyLength,
      'sha512',
    );

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted) + decipher.final('utf8');
  }

  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  compareHash(data: string, hash: string): boolean {
    return this.hash(data) === hash;
  }

  generateSecureToken(length: number = 48): string {
    return crypto.randomBytes(length).toString('hex');
  }
}
