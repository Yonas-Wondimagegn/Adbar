import { Module } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { FreelanceController } from './freelance.controller';
import { FreelanceService } from './freelance.service';

@Module({
  controllers: [FreelanceController],
  providers: [FreelanceService, PrismaService],
  exports: [FreelanceService],
})
export class FreelanceModule {}
