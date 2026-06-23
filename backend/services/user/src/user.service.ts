import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { EncryptionService } from '@adbar/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as crypto from 'crypto';

export interface UserPreferences {
  language: string;
  currency: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  theme: 'light' | 'dark' | 'system';
}

const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'en',
  currency: 'USD',
  timezone: 'UTC',
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  marketingEmails: false,
  theme: 'system',
};

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Get full user profile
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        roles: true,
        emailVerified: true,
        phoneVerified: true,
        mfaEnabled: true,
        language: true,
        currency: true,
        dataSaverMode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check email uniqueness if changing email
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });

      if (existingUser) {
        throw new ConflictException('Email is already in use');
      }
    }

    const updateData: Record<string, any> = {};

    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phoneNumber !== undefined) updateData.phone = dto.phoneNumber;
    if (dto.email !== undefined) {
      updateData.email = dto.email.toLowerCase();
      updateData.emailVerified = false; // Require re-verification
    }
    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.postalCode !== undefined) updateData.postalCode = dto.postalCode;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        roles: true,
        emailVerified: true,
        phoneVerified: true,
        mfaEnabled: true,
        bio: true,
        dateOfBirth: true,
        address: true,
        city: true,
        country: true,
        postalCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Profile updated for user: ${userId}`);

    return {
      ...updatedUser,
    };
  }

  /**
   * Get user preferences
   */
  async getPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return DEFAULT_PREFERENCES;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedPreferences: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      ...(dto.language !== undefined && { language: dto.language }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      ...(dto.emailNotifications !== undefined && { emailNotifications: dto.emailNotifications }),
      ...(dto.pushNotifications !== undefined && { pushNotifications: dto.pushNotifications }),
      ...(dto.smsNotifications !== undefined && { smsNotifications: dto.smsNotifications }),
      ...(dto.marketingEmails !== undefined && { marketingEmails: dto.marketingEmails }),
      ...(dto.theme !== undefined && { theme: dto.theme }),
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferences: updatedPreferences,
      } as any,
    });

    this.logger.log(`Preferences updated for user: ${userId}`);

    return updatedPreferences;
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(userId: string, file: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // In production: upload to S3/Cloudinary and get URL
    // For now, we'll store a base64 data URL or file path
    const avatarUrl = await this.storeAvatarFile(userId, file);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    this.logger.log(`Avatar uploaded for user: ${userId}`);

    return {
      avatarUrl: updatedUser.avatarUrl,
      message: 'Avatar uploaded successfully',
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.comparePassword(
      dto.currentPassword,
      (user as any).passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Ensure new password is different
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const hashedPassword = await this.hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        passwordChangedAt: new Date(),
      },
    });

    this.logger.log(`Password changed for user: ${userId}`);

    return {
      message: 'Password changed successfully. All other sessions have been logged out.',
    };
  }

  /**
   * Get public profile (limited fields)
   */
  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // ==================== Private Helpers ====================

  private async hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });
  }

  private async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hashedPassword.split(':');
      if (!salt || !key) {
        resolve(false);
        return;
      }
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(key === derivedKey.toString('hex'));
      });
    });
  }

  private async storeAvatarFile(userId: string, file: any): Promise<string> {
    // In production: upload to S3, Cloudinary, or similar
    // Return the public URL
    // For now, return a placeholder path
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `avatars/${userId}/${Date.now()}.${fileExtension}`;

    // Placeholder: in production, this would be the actual upload logic
    this.logger.log(`Storing avatar file: ${fileName} (${file.size} bytes)`);

    return `/uploads/${fileName}`;
  }
}
