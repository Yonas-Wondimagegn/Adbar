import { Module } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';

@Module({
  controllers: [ProductController, StoreController],
  providers: [PrismaService, ProductService, StoreService],
  exports: [ProductService, StoreService],
})
export class ProductModule {}
