import { Module } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';

@Module({
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway, PrismaService],
  exports: [MessagingService],
})
export class MessagingModule {}
