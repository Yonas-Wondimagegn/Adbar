import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@adbar/common';
import { CurrentUser } from '@adbar/common';
import { EscrowService } from './escrow.service';
import {
  CreateEscrowDto,
  FundEscrowDto,
  ReleaseMilestoneDto,
  RefundEscrowDto,
} from './dto/create-escrow.dto';

@ApiTags('escrow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new escrow agreement with milestones' })
  async createEscrow(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEscrowDto,
  ) {
    return this.escrowService.createEscrow(userId, dto);
  }

  @Post(':id/fund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fund an escrow agreement' })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  async fundEscrow(
    @CurrentUser('id') userId: string,
    @Param('id') escrowId: string,
    @Body() dto: FundEscrowDto,
  ) {
    return this.escrowService.fundEscrow(escrowId, userId, dto);
  }

  @Post(':id/release/:milestoneIndex')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release a milestone payment (with commission deduction)' })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  @ApiParam({ name: 'milestoneIndex', description: 'Milestone index (0-based)' })
  async releaseMilestone(
    @CurrentUser('id') userId: string,
    @Param('id') escrowId: string,
    @Param('milestoneIndex', ParseIntPipe) milestoneIndex: number,
    @Body() dto: ReleaseMilestoneDto,
  ) {
    return this.escrowService.releaseMilestone(escrowId, milestoneIndex, userId, dto);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund an escrow (full or partial)' })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  async refundEscrow(
    @CurrentUser('id') userId: string,
    @Param('id') escrowId: string,
    @Body() dto: RefundEscrowDto,
  ) {
    return this.escrowService.refundEscrow(escrowId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get escrow status and details' })
  @ApiParam({ name: 'id', description: 'Escrow ID' })
  async getEscrowStatus(
    @CurrentUser('id') userId: string,
    @Param('id') escrowId: string,
  ) {
    return this.escrowService.getEscrowStatus(escrowId, userId);
  }
}
