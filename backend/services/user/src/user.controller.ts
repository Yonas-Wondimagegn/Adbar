import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Logger,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CurrentUser } from '@adbar/common';
import { Public } from '@adbar/common';
import { JwtAuthGuard } from '@adbar/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Express } from 'express';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.userService.getProfile(userId);
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(userId, updateProfileDto);
  }

  @Get('me/preferences')
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.userService.getPreferences(userId);
  }

  @Put('me/preferences')
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ) {
    return this.userService.updatePreferences(userId, updatePreferencesDto);
  }

  @Put('me/avatar')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (_req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        return callback(new BadRequestException('Only image files (jpg, jpeg, png, gif, webp) are allowed'), false);
      }
      callback(null, true);
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.userService.uploadAvatar(userId, file);
  }

  @Put('me/password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(userId, changePasswordDto);
  }

  @Public()
  @Get(':id/public')
  async getPublicProfile(@Param('id', ParseUUIDPipe) userId: string) {
    return this.userService.getPublicProfile(userId);
  }
}
