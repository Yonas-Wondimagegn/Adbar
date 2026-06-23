import { Module } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { DisputeController } from './dispute.controller';
import { DisputeService } from './dispute.service';

@Module({
  controllers: [DisputeController],
  providers: [DisputeService, PrismaService],
  exports: [DisputeService],
})
export class DisputeModule {}
