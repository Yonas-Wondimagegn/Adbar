import { Module } from '@nestjs/common';
import { PrismaService, EncryptionService } from '@adbar/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService, EncryptionService],
  exports: [UserService],
})
export class UserModule {}
