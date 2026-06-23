import { Module } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { EscrowController } from './escrow.controller';
import { EscrowService } from './escrow.service';

@Module({
  controllers: [EscrowController],
  providers: [EscrowService, PrismaService],
  exports: [EscrowService],
})
export class EscrowModule {}
