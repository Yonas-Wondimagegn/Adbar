import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@adbar/common';
import { ContractService } from './contract.service';

@ApiTags('contracts')
@Controller('contracts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a contract from an accepted proposal' })
  async createContract(
    @Body() createContractDto: any,
    @CurrentUser('id') userId: string,
  ) {
    const contract = await this.contractService.createContractFromProposal(createContractDto, userId);
    return { statusCode: HttpStatus.CREATED, data: contract, message: 'Contract created successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all contracts for current user' })
  async getContracts(@CurrentUser('id') userId: string) {
    return this.contractService.getUserContracts(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contract by ID' })
  async getContract(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const contract = await this.contractService.getContract(id, userId);
    return { statusCode: HttpStatus.OK, data: contract };
  }

  @Post(':id/sign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign a contract' })
  async signContract(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const contract = await this.contractService.signContract(id, userId);
    return { statusCode: HttpStatus.OK, data: contract, message: 'Contract signed successfully' };
  }

  @Post(':id/milestones')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add milestone to contract' })
  async addMilestone(
    @Param('id') id: string,
    @Body() addMilestoneDto: any,
    @CurrentUser('id') userId: string,
  ) {
    const milestone = await this.contractService.addMilestone(id, addMilestoneDto, userId);
    return { statusCode: HttpStatus.CREATED, data: milestone, message: 'Milestone added successfully' };
  }

  @Post(':id/milestones/:mid/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit milestone deliverables' })
  async submitMilestone(
    @Param('id') id: string,
    @Param('mid') milestoneId: string,
    @Body() submitMilestoneDto: any,
    @CurrentUser('id') userId: string,
  ) {
    const milestone = await this.contractService.submitMilestone(id, milestoneId, submitMilestoneDto, userId);
    return { statusCode: HttpStatus.OK, data: milestone, message: 'Milestone submitted successfully' };
  }

  @Post(':id/milestones/:mid/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a milestone (client)' })
  async approveMilestone(
    @Param('id') id: string,
    @Param('mid') milestoneId: string,
    @Body() approveMilestoneDto: any,
    @CurrentUser('id') userId: string,
  ) {
    const milestone = await this.contractService.approveMilestone(id, milestoneId, approveMilestoneDto, userId);
    return { statusCode: HttpStatus.OK, data: milestone, message: 'Milestone approved' };
  }

  @Post(':id/milestones/:mid/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a milestone (client)' })
  async rejectMilestone(
    @Param('id') id: string,
    @Param('mid') milestoneId: string,
    @Body() approveMilestoneDto: any,
    @CurrentUser('id') userId: string,
  ) {
    const milestone = await this.contractService.rejectMilestone(id, milestoneId, approveMilestoneDto, userId);
    return { statusCode: HttpStatus.OK, data: milestone, message: 'Milestone rejected' };
  }
}
