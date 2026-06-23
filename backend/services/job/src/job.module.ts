import { Module } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { JobController } from './job.controller';
import { JobService } from './job.service';

@Module({
  controllers: [JobController],
  providers: [JobService, PrismaService],
  exports: [JobService],
})
export class JobModule {}
