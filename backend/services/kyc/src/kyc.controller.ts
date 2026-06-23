import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@adbar/common';
import { KYCService } from './kyc.service';
import { Express } from 'express';

class SubmitVerificationDto {
  provider!: string;
  documentType!: 'national_id' | 'passport' | 'drivers_license';
  documentNumber!: string;
  firstName!: string;
  lastName!: string;
  dateOfBirth?: string;
  nationality?: string;
  documentFrontImage?: string;
  documentBackImage?: string;
  selfieImage?: string;
  metadata?: Record<string, any>;
}

class FaydaVerifyDto {
  documentNumber!: string;
  firstName!: string;
  lastName!: string;
  dateOfBirth?: string;
}

class ReviewVerificationDto {
  decision!: 'approved' | 'rejected' | 'needs_more_info';
  reviewNote!: string;
  rejectionReason?: string;
}

@ApiTags('kyc')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kyc')
export class KYCController {
  constructor(private readonly kycService: KYCService) {}

  // ========== SUBMIT VERIFICATION ==========

  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit identity verification request' })
  async submitVerification(
    @Body() submitDto: SubmitVerificationDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.kycService.submitVerification(submitDto, userId);
    return {
      statusCode: HttpStatus.CREATED,
      data: result,
      message: 'Verification submitted successfully',
    };
  }

  // ========== CHECK STATUS ==========

  @Get('status')
  @ApiOperation({ summary: 'Get KYC verification status for current user' })
  async getVerificationStatus(@CurrentUser('id') userId: string) {
    const result = await this.kycService.getVerificationStatus(userId);
    return { statusCode: HttpStatus.OK, data: result };
  }

  // ========== FAYDA VERIFY ==========

  @Post('fayda/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify identity via Fayda national ID' })
  async verifyFayda(
    @Body() faydaDto: FaydaVerifyDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.kycService.verifyFayda(faydaDto, userId);
    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: 'Fayda verification processed',
    };
  }

  // ========== DOCUMENT UPLOAD ==========

  @Post('document/upload')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string', example: 'national_id' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload KYC supporting document' })
  async uploadDocument(
    @UploadedFile() file: any,
    @Query('documentType') documentType: string,
    @Query('provider') provider: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.kycService.uploadDocument(
      userId,
      documentType,
      file.buffer,
      file.originalname,
      provider,
    );
    return {
      statusCode: HttpStatus.CREATED,
      data: result,
      message: 'Document uploaded successfully',
    };
  }

  // ========== LIST VERIFICATIONS ==========

  @Get('verifications')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'List all KYC verifications (admin only)' })
  async getVerifications(
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.kycService.getAllVerifications({
      status,
      provider,
      page: page || 1,
      limit: limit || 20,
    });
    return { statusCode: HttpStatus.OK, data: result };
  }

  // ========== REVIEW VERIFICATION ==========

  @Put('verifications/:id/review')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review a KYC verification (admin only)' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  async reviewVerification(
    @Param('id') verificationId: string,
    @Body() reviewDto: ReviewVerificationDto,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.kycService.reviewVerification(
      verificationId,
      reviewDto,
      adminId,
    );
    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: 'Verification reviewed successfully',
    };
  }
}
