import { Module } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentProviderRegistry } from './payment-provider.registry';

@Module({
  imports: [HttpModule],
  controllers: [PaymentController],
  providers: [PrismaService, PaymentService, PaymentProviderRegistry],
  exports: [PaymentService],
})
export class PaymentModule {}
