import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// Core modules
import { AuthModule } from '../../auth/src/auth.module';
import { UserModule } from '../../user/src/user.module';
import { ProductModule } from '../../product/src/product.module';
import { OrderModule } from '../../order/src/order.module';
import { PaymentModule } from '../../payment/src/payment.module';
import { WalletModule } from '../../wallet/src/wallet.module';
import { EscrowModule } from '../../escrow/src/escrow.module';
import { FreelanceModule } from '../../freelance/src/freelance.module';
import { JobModule } from '../../job/src/job.module';
import { ContractModule } from '../../contract/src/contract.module';
import { DisputeModule } from '../../dispute/src/dispute.module';
import { ReviewModule } from '../../review/src/review.module';
import { NotificationModule } from '../../notification/src/notification.module';
import { MessagingModule } from '../../messaging/src/messaging.module';
import { SearchModule } from '../../search/src/search.module';
import { KYCModule } from '../../kyc/src/kyc.module';
import { UssdModule } from '../../ussd/src/ussd.module';

// New modules
import { AnalyticsModule } from '../../analytics/src/analytics.module';
import { AiMatchingModule } from '../../ai-matching/src/ai-matching.module';
import { AdminModule } from '../../admin/src/admin.module';

// Gateway middleware
import { AuthMiddleware } from './middleware/auth.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Core service modules
    AuthModule,
    UserModule,
    ProductModule,
    OrderModule,
    PaymentModule,
    WalletModule,
    EscrowModule,
    FreelanceModule,
    JobModule,
    ContractModule,
    DisputeModule,
    ReviewModule,
    NotificationModule,
    MessagingModule,
    SearchModule,
    KYCModule,
    UssdModule,

    // New modules
    AnalyticsModule,
    AiMatchingModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {
  // Middleware is configured in main.ts via app.use()
}
