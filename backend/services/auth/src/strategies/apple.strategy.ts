import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppleOAuthStrategy {
  private readonly logger = new Logger(AppleOAuthStrategy.name);

  constructor(private readonly configService: ConfigService) {
    // Apple OAuth strategy placeholder
    // Requires passport-apple package to be installed
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    try {
      const appleUser = {
        id: profile.id || profile.sub,
        email: profile.email,
        firstName: profile.name?.firstName || '',
        lastName: profile.name?.lastName || '',
        accessToken,
      };

      this.logger.log(`Apple OAuth validated for email: ${appleUser.email}`);
      return appleUser;
    } catch (error) {
      this.logger.error('Apple OAuth validation error', error as string);
      throw error;
    }
  }
}
