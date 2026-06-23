import { Module } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { HttpModule } from '@nestjs/axios';
import { KYCController } from './kyc.controller';
import { KYCService } from './kyc.service';
import { IdentityVerificationRegistry } from './identity-verification.registry';
import { FaydaAdapter } from './adapters/fayda.adapter';
import { PassportAdapter } from './adapters/passport.adapter';

@Module({
  imports: [HttpModule],
  controllers: [KYCController],
  providers: [PrismaService, 
    KYCService,
    IdentityVerificationRegistry,
    FaydaAdapter,
    PassportAdapter,
  ],
  exports: [KYCService],
})
export class KYCModule {}
