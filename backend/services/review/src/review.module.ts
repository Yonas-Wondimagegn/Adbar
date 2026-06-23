import { Module } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

@Module({
  controllers: [ReviewController],
  providers: [ReviewService, PrismaService],
  exports: [ReviewService],
})
export class ReviewModule {}
