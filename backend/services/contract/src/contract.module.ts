import { Module } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';

@Module({
  controllers: [ContractController],
  providers: [ContractService, PrismaService],
  exports: [ContractService],
})
export class ContractModule {}
