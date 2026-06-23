import { Module } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { UssdController } from './ussd.controller';
import { UssdService } from './ussd.service';

@Module({
  controllers: [UssdController],
  providers: [UssdService, PrismaService],
  exports: [UssdService],
})
export class UssdModule {}
