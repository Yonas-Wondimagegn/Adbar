import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, Public } from '@adbar/common';
import { UssdService } from './ussd.service';

class UssdCallbackDto {
  phoneNumber!: string;
  sessionId!: string;
  userInput!: string;
  networkCode?: string;
  serviceCode?: string;
}

@ApiTags('ussd')
@Controller('ussd')
export class UssdController {
  constructor(private readonly ussdService: UssdService) {}

  // ========== USSD CALLBACK ==========

  @Post('callback')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle USSD callback from telecom provider (*801#)' })
  async handleCallback(@Body() callbackDto: UssdCallbackDto) {
    const result = await this.ussdService.handleUssdSession(
      callbackDto.phoneNumber,
      callbackDto.sessionId,
      callbackDto.userInput,
      callbackDto.networkCode,
    );

    return {
      statusCode: HttpStatus.OK,
      data: {
        sessionId: result.sessionId,
        phoneNumber: result.phoneNumber,
        text: result.text,
        isEnd: result.isEnd,
      },
    };
  }

  // ========== SESSIONS ==========

  @Get('sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get USSD sessions (admin only)' })
  async getSessions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.ussdService.getSessions(page || 1, limit || 20);
    return { statusCode: HttpStatus.OK, data: result };
  }

  // ========== ANALYTICS ==========

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get USSD usage analytics (admin only)' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days for analytics period' })
  async getAnalytics(@Query('days') days?: number) {
    const result = await this.ussdService.getAnalytics(days || 30);
    return { statusCode: HttpStatus.OK, data: result };
  }
}
