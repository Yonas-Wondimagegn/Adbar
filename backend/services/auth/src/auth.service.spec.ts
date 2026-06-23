import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@adbar/common';
import { EncryptionService } from '@adbar/common';
import { MfaService } from './mfa/mfa.service';
import { ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userRole: {
    create: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  loginHistory: {
    create: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    const config: Record<string, string> = {
      JWT_SECRET: 'test-secret-min-32-chars-long!!',
      JWT_EXPIRATION: '15m',
      JWT_REFRESH_EXPIRATION: '7d',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
    };
    return config[key] || defaultValue;
  }),
};

const mockEncryptionService = {
  encrypt: jest.fn((text: string) => `encrypted:${text}`),
  decrypt: jest.fn((text: string) => text.replace('encrypted:', '')),
  hash: jest.fn((text: string) => bcrypt.hashSync(text, 10)),
  generateSecureToken: jest.fn(() => 'secure-token-123'),
};

const mockMfaService = {
  generateSecret: jest.fn().mockResolvedValue({
    secret: 'test-secret',
    base32: 'test-secret',
    otpauthUrl: 'otpauth://totp/Adbar:test@example.com?secret=test-secret',
    encryptedSecret: 'encrypted:test-secret',
  }),
  verifyToken: jest.fn().mockResolvedValue(true),
  generateBackupCodes: jest.fn().mockResolvedValue({
    plainCodes: ['ABCD-EFGH'],
    hashedCodes: ['hashed-code'],
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async (): Promise<void> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: MfaService, useValue: mockMfaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'StrongP@ss1',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+123****7890',
      roles: ['buyer'],
    };

    it('should register a new user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: [{ role: 'buyer' }],
        mfaEnabled: false,
        emailVerified: false,
        createdAt: new Date(),
      });
      mockPrismaService.refreshToken.create.mockResolvedValue({ id: 'token-1' });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(mockPrismaService.user.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'StrongP@ss1',
    };

    it('should login user with valid credentials', async () => {
      const hashedPassword = bcrypt.hashSync('StrongP@ss1', 12);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        mfaEnabled: false,
        mfaSecret: null,
        roles: [{ id: 'r1', role: 'buyer', userId: 'user-123', createdAt: new Date() }],
        emailVerified: true,
        phoneVerified: true,
        kycLevel: 'LEVEL_1',
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.refreshToken.create.mockResolvedValue({ id: 'token-1' });
      mockPrismaService.loginHistory.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
    });

    it('should return mfaRequired when MFA is enabled', async () => {
      const hashedPassword = bcrypt.hashSync('StrongP@ss1', 12);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        mfaEnabled: true,
        mfaSecret: 'encrypted:secret',
        roles: [{ id: 'r1', role: 'buyer', userId: 'user-123', createdAt: new Date() }],
        emailVerified: true,
        phoneVerified: true,
        kycLevel: 'LEVEL_1',
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('mfaRequired', true);
      expect(result).toHaveProperty('tempToken');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      const hashedPassword = bcrypt.hashSync('StrongP@ss1', 12);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        mfaEnabled: false,
        roles: [{ id: 'r1', role: 'buyer', userId: 'user-123', createdAt: new Date() }],
        emailVerified: true,
        phoneVerified: true,
        kycLevel: 'LEVEL_1',
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.validateUser('test@example.com', 'StrongP@ss1');

      expect(result).toBeDefined();
      expect(result!.email).toBe('test@example.com');
    });

    it('should return null for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password');
      expect(result).toBeNull();
    });

    it('should return null for wrong password', async () => {
      const hashedPassword = bcrypt.hashSync('StrongP@ss1', 12);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        mfaEnabled: false,
        roles: [{ id: 'r1', role: 'buyer', userId: 'user-123', createdAt: new Date() }],
        emailVerified: true,
        phoneVerified: true,
        kycLevel: 'LEVEL_1',
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.validateUser('test@example.com', 'WrongP@ss1');
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const result = await service.logout('user-123');
      expect(result.message).toBe('Logged out successfully');
    });
  });
});
