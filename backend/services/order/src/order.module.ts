import { Module } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  controllers: [OrderController],
  providers: [PrismaService, OrderService],
  exports: [OrderService],
})
export class OrderModule {}
