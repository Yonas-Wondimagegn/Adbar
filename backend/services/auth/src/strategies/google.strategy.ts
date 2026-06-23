import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID', ''),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET', ''),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL', 'http://localhost:3000/auth/oauth/google/callback'),
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, emails, name, photos } = profile;

      if (!emails || emails.length === 0) {
        return done(new Error('No email found from Google'), false);
      }

      const googleUser = {
        id,
        email: emails[0].value,
        firstName: name?.givenName || '',
        lastName: name?.familyName || '',
        picture: photos?.[0]?.value || null,
        accessToken,
      };

      this.logger.log(`Google OAuth validated for email: ${googleUser.email}`);
      return done(null, googleUser);
    } catch (error) {
      this.logger.error('Google OAuth validation error', error as string);
      return done(error as Error, false);
    }
  }
}
