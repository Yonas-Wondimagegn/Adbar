import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService, EncryptionService } from '@adbar/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { AppleOAuthStrategy } from './strategies/apple.strategy';
import { MfaService } from './mfa/mfa.service';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'dev-jwt-secret-change-in-production'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '15m'),
          issuer: 'adbar-auth',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    EncryptionService,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    AppleOAuthStrategy,
    MfaService,
  ],
  exports: [AuthService, MfaService],
})
export class AuthModule {}
