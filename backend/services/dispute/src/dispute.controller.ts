import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@adbar/common';
import { DisputeService } from './dispute.service';

@ApiTags('disputes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('disputes')
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  // ========== OPEN DISPUTE ==========

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Open a new dispute for an order' })
  async openDispute(
    @Body() openDisputeDto: any,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.disputeService.openDispute(openDisputeDto, userId);
    return {
      statusCode: HttpStatus.CREATED,
      data: result,
      message: 'Dispute opened successfully',
    };
  }

  // ========== LIST DISPUTES ==========

  @Get()
  @ApiOperation({ summary: 'Get all disputes for the current user' })
  async getUserDisputes(@CurrentUser('id') userId: string) {
    const result = await this.disputeService.getUserDisputes(userId);
    return { statusCode: HttpStatus.OK, data: result };
  }

  // ========== GET DISPUTE DETAIL ==========

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute details by ID' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  async getDispute(
    @Param('id') disputeId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.disputeService.getDispute(disputeId, userId);
    return { statusCode: HttpStatus.OK, data: result };
  }

  // ========== ADD EVIDENCE ==========

  @Post(':id/evidence')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add evidence to a dispute' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  async addEvidence(
    @Param('id') disputeId: string,
    @Body() addEvidenceDto: any,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.disputeService.addEvidence(
      disputeId,
      addEvidenceDto,
      userId,
    );
    return {
      statusCode: HttpStatus.CREATED,
      data: result,
      message: 'Evidence added successfully',
    };
  }

  // ========== RESOLVE DISPUTE ==========

  @Post(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a dispute (admin/moderator only)' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  async resolveDispute(
    @Param('id') disputeId: string,
    @Body() resolveDisputeDto: any,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.disputeService.resolveDispute(
      disputeId,
      resolveDisputeDto,
      userId,
    );
    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: 'Dispute resolved successfully',
    };
  }

  // ========== ESCALATE DISPUTE ==========

  @Post(':id/escalate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Escalate a dispute to admin review' })
  @ApiParam({ name: 'id', description: 'Dispute ID' })
  async escalateDispute(
    @Param('id') disputeId: string,
    @Body() escalateDto: any,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.disputeService.escalateDispute(
      disputeId,
      escalateDto,
      userId,
    );
    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: 'Dispute escalated successfully',
    };
  }
}
