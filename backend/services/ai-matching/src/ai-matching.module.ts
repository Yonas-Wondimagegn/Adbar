import { Module } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { AiMatchingController } from './ai-matching.controller';
import { AiMatchingService } from './ai-matching.service';

@Module({
  controllers: [AiMatchingController],
  providers: [AiMatchingService, PrismaService],
  exports: [AiMatchingService],
})
export class AiMatchingModule {}
