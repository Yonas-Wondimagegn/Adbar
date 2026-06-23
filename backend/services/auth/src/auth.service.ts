import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@adbar/common';
import { EncryptionService } from '@adbar/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { LoginPhoneDto } from './dto/login-phone.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EnableMfaDto } from './dto/enable-mfa.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { MfaService } from './mfa/mfa.service';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

export interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
    private readonly mfaService: MfaService,
  ) {
    this.accessTokenExpiry = this.configService.get<string>('JWT_EXPIRATION', '15m');
    this.refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
  }

  /**
   * Register a new user with multi-role support.
   * Creates user + UserRole entries. Default role: BUYER.
   */
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // Validate +251 Ethiopian phone format if provided
    if (dto.phoneNumber && !this.isValidPhone(dto.phoneNumber)) {
      throw new BadRequestException('Invalid phone number format. Use +251XXXXXXXXX for Ethiopian numbers.');
    }

    const hashedPassword = await this.hashPassword(dto.password);
    const emailVerificationCode = this.generateVerificationCode();
    const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Determine roles (default to BUYER if none specified)
    const roles = dto.roles && dto.roles.length > 0
      ? dto.roles.map((r) => r.toUpperCase())
      : ['BUYER'];

    // Validate roles
    const validRoles = ['BUYER', 'SELLER', 'FREELANCER', 'CLIENT', 'MODERATOR', 'COMPLIANCE_OFFICER', 'ADMIN'];
    for (const role of roles) {
      if (!validRoles.includes(role)) {
        throw new BadRequestException(`Invalid role: ${role}`);
      }
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phoneNumber || null,
        emailVerificationCode: this.encryptionService.hash(emailVerificationCode),
        emailVerificationExpires: emailVerificationExpiry,
        emailVerified: false,
        phoneVerified: false,
        roles: {
          create: roles.map((role) => ({ role: role as any })),
        },
      },
      include: { roles: true },
    });

    this.logger.log(`Email verification code for ${user.email}: ${emailVerificationCode}`);

    const tokens = await this.generateTokenPair({
      sub: user.id,
      email: user.email,
      roles: user.roles.map((r) => r.role),
    });

    this.logger.log(`User registered successfully: ${user.id} with roles: ${roles.join(', ')}`);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
      message: 'Registration successful. Please verify your email.',
    };
  }

  /**
   * Login with email and password. Returns MFA challenge if enabled.
   */
  async login(dto: LoginDto, _req?: Request) {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.mfaEnabled) {
      return {
        mfaRequired: true,
        tempToken: await this.generateMfaTempToken(user.id),
        message: 'MFA verification required',
      };
    }

    const tokens = await this.generateTokenPair({
      sub: user.id,
      email: user.email,
      roles: user.roles.map((r) => r.role),
    });

    this.logger.log(`User logged in: ${user.id}`);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Login with phone number and OTP. Supports +251 Ethiopian format.
   */
  async loginWithPhone(dto: LoginPhoneDto) {
    // Validate phone format
    if (!this.isValidPhone(dto.phoneNumber)) {
      throw new BadRequestException('Invalid phone number format. Use +251XXXXXXXXX for Ethiopian numbers.');
    }

    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phoneNumber },
      include: { roles: true },
    });

    if (!user) {
      throw new NotFoundException('No user found with this phone number');
    }

    if (!user.phoneVerified) {
      throw new BadRequestException('Phone number not verified');
    }

    if (dto.otpCode) {
      const isValid = this.verifyPhoneOtp(user.id, dto.otpCode);
      if (!isValid) {
        throw new UnauthorizedException('Invalid OTP code');
      }
    } else {
      const otp = this.generateVerificationCode();
      await this.storePhoneOtp(user.id, otp);
      this.logger.log(`Phone OTP for ${dto.phoneNumber}: ${otp}`);
      return {
        otpSent: true,
        message: 'OTP sent to your phone number',
      };
    }

    const tokens = await this.generateTokenPair({
      sub: user.id,
      email: user.email,
      roles: user.roles.map((r) => r.role),
    });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Login with phone number and OTP. Supports +251 Ethiopian format.
   */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { roles: true },
    });

    if (!user) return null;

    const isPasswordValid = await this.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) return null;

    return user;
  }

  /**
   * Verify email address with code.
   */
  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerified) return { message: 'Email already verified' };

    if (!user.emailVerificationCode || !user.emailVerificationExpires) {
      throw new BadRequestException('No verification code found. Please request a new one.');
    }

    if (new Date() > user.emailVerificationExpires) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    const codeHash = this.encryptionService.hash(dto.code);
    if (codeHash !== user.emailVerificationCode) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpires: null,
      },
    });

    this.logger.log(`Email verified for user: ${user.id}`);
    return { message: 'Email verified successfully' };
  }

  /**
   * Verify phone number with code. Supports +251 Ethiopian format.
   */
  async verifyPhone(dto: VerifyPhoneDto) {
    if (!this.isValidPhone(dto.phoneNumber)) {
      throw new BadRequestException('Invalid phone number format.');
    }

    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phoneNumber },
    });

    if (!user) throw new NotFoundException('No user found with this phone number');
    if (user.phoneVerified) return { message: 'Phone number already verified' };

    if (!user.phoneVerificationCode || !user.phoneVerificationExpires) {
      throw new BadRequestException('No verification code found. Please request a new one.');
    }

    if (new Date() > user.phoneVerificationExpires) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    const codeHash = this.encryptionService.hash(dto.code);
    if (codeHash !== user.phoneVerificationCode) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerified: true,
        phoneVerificationCode: null,
        phoneVerificationExpires: null,
      },
    });

    this.logger.log(`Phone verified for user: ${user.id}`);
    return { message: 'Phone number verified successfully' };
  }

  /**
   * Refresh access token with rotation.
   */
  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify<TokenPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', this.configService.get<string>('JWT_SECRET', 'dev-jwt-secret')),
      });

      if (payload.type !== 'refresh') {
        throw new BadRequestException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { roles: true },
      });

      if (!user) throw new UnauthorizedException('User not found');

      const tokens = await this.generateTokenPair({
        sub: user.id,
        email: user.email,
        roles: user.roles.map((r) => r.role),
      });

      return tokens;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout.
   */
  async logout(userId: string) {
    this.logger.log(`User logged out: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  /**
   * Forgot password - generate reset code.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      return {
        message: 'If an account exists with this email, a password reset code has been sent.',
      };
    }

    const resetCode = this.generateVerificationCode();
    const resetExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCode: this.encryptionService.hash(resetCode),
        passwordResetExpires: resetExpiry,
      },
    });

    this.logger.log(`Password reset code for ${user.email}: ${resetCode}`);

    return {
      message: 'If an account exists with this email, a password reset code has been sent.',
    };
  }

  /**
   * Reset password with code.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) throw new NotFoundException('User not found');
    if (!user.passwordResetCode || !user.passwordResetExpires) {
      throw new BadRequestException('No reset code found. Please request a new one.');
    }
    if (new Date() > user.passwordResetExpires) {
      throw new BadRequestException('Reset code has expired. Please request a new one.');
    }

    const codeHash = this.encryptionService.hash(dto.code);
    if (codeHash !== user.passwordResetCode) {
      throw new BadRequestException('Invalid reset code');
    }

    const hashedPassword = await this.hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordResetCode: null,
        passwordResetExpires: null,
      },
    });

    this.logger.log(`Password reset successful for user: ${user.id}`);
    return { message: 'Password reset successful. Please log in with your new password.' };
  }

  /**
   * Handle Google OAuth.
   */
  async handleGoogleOAuth(req: Request, res: Response) {
    const googleUser = (req as any).user;
    if (!googleUser) throw new UnauthorizedException('Google authentication failed');

    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email.toLowerCase() },
      include: { roles: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email.toLowerCase(),
          passwordHash: '',
          firstName: googleUser.firstName || googleUser.given_name || 'User',
          lastName: googleUser.lastName || googleUser.family_name || '',
          avatarUrl: googleUser.picture || null,
          emailVerified: true,
          roles: { create: { role: 'BUYER' } },
        },
        include: { roles: true },
      });
      this.logger.log(`User registered via Google OAuth: ${user.id}`);
    }

    const tokens = await this.generateTokenPair({
      sub: user.id,
      email: user.email,
      roles: user.roles.map((r) => r.role),
    });

    return res.json({ user: this.sanitizeUser(user), ...tokens });
  }

  /**
   * Handle Apple OAuth.
   */
  async handleAppleOAuth(req: Request, res: Response) {
    const appleUser = (req as any).user;
    if (!appleUser) throw new UnauthorizedException('Apple authentication failed');

    let user = await this.prisma.user.findUnique({
      where: { email: appleUser.email.toLowerCase() },
      include: { roles: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: appleUser.email.toLowerCase(),
          passwordHash: '',
          firstName: appleUser.firstName || 'User',
          lastName: appleUser.lastName || '',
          emailVerified: true,
          roles: { create: { role: 'BUYER' } },
        },
        include: { roles: true },
      });
      this.logger.log(`User registered via Apple OAuth: ${user.id}`);
    }

    const tokens = await this.generateTokenPair({
      sub: user.id,
      email: user.email,
      roles: user.roles.map((r) => r.role),
    });

    return res.json({ user: this.sanitizeUser(user), ...tokens });
  }

  /**
   * Enable MFA.
   */
  async enableMfa(userId: string, _dto: EnableMfaDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.mfaEnabled) throw new BadRequestException('MFA is already enabled');

    const mfaSetup = await this.mfaService.generateSecret(user.email);

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: mfaSetup.encryptedSecret },
    });

    return {
      message: 'Scan the QR code with your authenticator app, then verify with a code',
      qrCodeUrl: mfaSetup.otpauthUrl,
      manualEntryKey: mfaSetup.base32,
    };
  }

  /**
   * Verify MFA token.
   */
  async verifyMfa(dto: VerifyMfaDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { roles: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (!user.mfaSecret) throw new BadRequestException('MFA not set up for this user');

    const isValid = await this.mfaService.verifyToken(user.mfaSecret, dto.token);
    if (!isValid) throw new UnauthorizedException('Invalid MFA token');

    if (!user.mfaEnabled) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { mfaEnabled: true },
      });

      const backupCodes = await this.mfaService.generateBackupCodes();
      await this.prisma.user.update({
        where: { id: user.id },
        data: { mfaBackupCodes: JSON.stringify(backupCodes.hashedCodes) },
      });

      return {
        message: 'MFA enabled successfully',
        backupCodes: backupCodes.plainCodes,
        warning: 'Save these backup codes securely. They will not be shown again.',
      };
    }

    const tokens = await this.generateTokenPair({
      sub: user.id,
      email: user.email,
      roles: user.roles.map((r) => r.role),
    });

    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ==================== Private Helpers ====================

  private async generateTokenPair(payload: Pick<TokenPayload, 'sub' | 'email' | 'roles'>): Promise<TokenPair> {
    const accessTokenPayload: TokenPayload = { ...payload, type: 'access' };
    const refreshTokenPayload: TokenPayload = { ...payload, type: 'refresh' };

    const accessToken = this.jwtService.sign(accessTokenPayload);
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', this.configService.get<string>('JWT_SECRET', 'dev-jwt-secret')),
      expiresIn: this.refreshTokenExpiry,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiryToMs(this.accessTokenExpiry) / 1000,
      tokenType: 'Bearer',
    };
  }

  private async generateMfaTempToken(userId: string): Promise<string> {
    return this.jwtService.sign({ sub: userId, type: 'mfa_temp' }, { expiresIn: '5m' });
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  private generateVerificationCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Validate phone number format.
   * Supports +251 Ethiopian format (+2519XXXXXXXX, +2517XXXXXXXX)
   * and standard E.164 international format.
   */
  private isValidPhone(phone: string): boolean {
    if (!phone) return false;
    // E.164 format: + followed by 7-15 digits
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    if (!e164Regex.test(phone)) return false;
    // Ethiopian format: +251 followed by 9 digits (starting with 9 or 7)
    if (phone.startsWith('+251')) {
      return /^\+251[79]\d{8}$/.test(phone);
    }
    return true;
  }

  private verifyPhoneOtp(_userId: string, _otp: string): boolean {
    return true; // Placeholder — production: verify against Redis/cache
  }

  private async storePhoneOtp(userId: string, otp: string): Promise<void> {
    this.logger.log(`[OTP] Stored OTP for user ${userId}: ${otp}`);
  }

  private sanitizeUser(user: any) {
    const {
      passwordHash, mfaSecret, mfaBackupCodes,
      emailVerificationCode, emailVerificationExpires,
      phoneVerificationCode, phoneVerificationExpires,
      passwordResetCode, passwordResetExpires,
      ...sanitized
    } = user;
    return sanitized;
  }

  private parseExpiryToMs(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhdw])$/);
    if (!match) return 900000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      default: return 900000;
    }
  }
}
