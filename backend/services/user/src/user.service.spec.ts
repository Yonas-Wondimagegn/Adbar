import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '@adbar/common';
import { EncryptionService } from '@adbar/common';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import * as crypto from 'crypto';

// Mock PrismaService
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

// Mock EncryptionService
const mockEncryptionService = {
  encrypt: jest.fn((text: string) => `encrypted:${text}`),
  decrypt: jest.fn((text: string) => text.replace('encrypted:', '')),
  hash: jest.fn((text: string) => crypto.createHash('sha256').update(text).digest('hex')),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async (): Promise<void> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: [{ role: 'BUYER' }],
        emailVerified: true,
        phoneVerified: false,
        mfaEnabled: false,
        language: 'en',
        currency: 'USD',
        dataSaverMode: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return default preferences when none set', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        language: null,
        currency: null,
        dataSaverMode: null,
      });

      const result = await service.getProfile('user-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('user-123');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user-123', email: 'test@example.com' })
        .mockResolvedValueOnce(null); // No email conflict

      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      });

      const result = await service.updateProfile('user-123', {
        firstName: 'Jane',
        lastName: 'Smith',
      });

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(mockPrismaService.user.update).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('nonexistent', { firstName: 'Jane' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user-123', email: 'test@example.com' })
        .mockResolvedValueOnce({ id: 'user-456', email: 'taken@example.com' }); // Email exists

      await expect(
        service.updateProfile('user-123', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should set emailVerified to false when email changes', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user-123', email: 'test@example.com' })
        .mockResolvedValueOnce(null);

      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-123',
        email: 'new@example.com',
        emailVerified: false,
      });

      await service.updateProfile('user-123', { email: 'new@example.com' });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emailVerified: false,
          }),
        }),
      );
    });
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
      });

      const result = await service.getPreferences('user-123');

      // Service always returns DEFAULT_PREFERENCES
      expect(result.language).toBe('en');
      expect(result.currency).toBe('USD');
      expect(result.timezone).toBe('UTC');
      expect(result.emailNotifications).toBe(true);
      expect(result.pushNotifications).toBe(true);
      expect(result.smsNotifications).toBe(false);
      expect(result.marketingEmails).toBe(false);
      expect(result.theme).toBe('system');
    });

    it('should return default preferences when none set', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
      });

      const result = await service.getPreferences('user-123');

      expect(result.language).toBe('en');
      expect(result.currency).toBe('USD');
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
      });

      mockPrismaService.user.update.mockResolvedValue({ id: 'user-123' });

      const result = await service.updatePreferences('user-123', {
        language: 'es',
        currency: 'EUR',
        theme: 'dark',
      });

      expect(result.language).toBe('es');
      expect(result.currency).toBe('EUR');
      expect(result.theme).toBe('dark');
      // Defaults preserved
      expect(result.emailNotifications).toBe(true);
      expect(result.pushNotifications).toBe(true);
      expect(result.smsNotifications).toBe(false);
      expect(result.marketingEmails).toBe(false);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePreferences('nonexistent', { language: 'fr' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = await new Promise<string>((resolve) => {
        crypto.scrypt('OldP@ssword1', salt, 64, (err, derivedKey) => {
          resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        passwordHash: hash,
      });

      mockPrismaService.user.update.mockResolvedValue({ id: 'user-123' });

      const result = await service.changePassword('user-123', {
        currentPassword: 'OldP@ssword1',
        newPassword: 'NewP@ssword1',
      });

      expect(result.message).toContain('Password changed successfully');
      expect(mockPrismaService.user.update).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for wrong current password', async () => {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = await new Promise<string>((resolve) => {
        crypto.scrypt('CorrectP@ss1', salt, 64, (err, derivedKey) => {
          resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        passwordHash: hash,
      });

      await expect(
        service.changePassword('user-123', {
          currentPassword: 'WrongP@ss1',
          newPassword: 'NewP@ssword1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if new password is same as current', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        passwordHash: 'some-hash',
      });

      await expect(
        service.changePassword('user-123', {
          currentPassword: 'SameP@ss1',
          newPassword: 'SameP@ss1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPublicProfile', () => {
    it('should return public profile with limited fields', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'avatar-url',
        bio: 'A seller',
        createdAt: new Date(),
      });

      const result = await service.getPublicProfile('user-123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('firstName');
      expect(result).toHaveProperty('lastName');
      expect(result).toHaveProperty('avatarUrl');
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getPublicProfile('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const mockFile = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('test'),
      } as any;

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        avatarUrl: null,
      });

      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-123',
        avatarUrl: '/uploads/avatars/user-123/avatar.png',
      });

      const result = await service.uploadAvatar('user-123', mockFile);

      expect(result).toHaveProperty('avatarUrl');
      expect(result.message).toContain('successfully');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const mockFile = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
        size: 1024,
      } as any;

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.uploadAvatar('nonexistent', mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
