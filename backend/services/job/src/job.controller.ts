import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@adbar/common';
import { PaginationDto } from '@adbar/common';
import { JobService } from './job.service';

class CreateJobDto {
  title!: string;
  description!: string;
  type!: string;
  budget!: number;
  currency?: string;
  deadline?: string;
  skills!: string[];
  attachments?: string[];
  location?: string;
  isRemote?: boolean;
}

class UpdateJobDto {
  title?: string;
  description?: string;
  type?: string;
  budget?: number;
  currency?: string;
  deadline?: string;
  skills?: string[];
  status?: string;
  attachments?: string[];
  location?: string;
  isRemote?: boolean;
}

class CreateProposalDto {
  jobId!: string;
  coverLetter!: string;
  proposedAmount!: number;
  estimatedDays!: number;
  milestones?: Array<{
    title: string;
    amount: number;
    dueDate?: string;
  }>;
}

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('client', 'admin')
  @ApiOperation({ summary: 'Create a new job posting' })
  async createJob(@Body() createJobDto: CreateJobDto, @CurrentUser('id') userId: string) {
    const job = await this.jobService.createJob(createJobDto, userId);
    return { statusCode: HttpStatus.CREATED, data: job, message: 'Job created successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all jobs with filters' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'budget', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'skills', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listJobs(
    @Query() paginationDto: PaginationDto,
    @Query('type') type?: string,
    @Query('budget') budget?: string,
    @Query('status') status?: string,
    @Query('skills') skills?: string,
  ) {
    return this.jobService.listJobs(paginationDto, { type, budget, status, skills });
  }

  @Get('my')
  @ApiOperation({ summary: 'Get jobs posted by current user' })
  async getMyJobs(@CurrentUser('id') userId: string, @Query() paginationDto: PaginationDto) {
    return this.jobService.getMyJobs(userId, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by ID' })
  async getJob(@Param('id') id: string) {
    const job = await this.jobService.getJob(id);
    return { statusCode: HttpStatus.OK, data: job };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('client', 'admin')
  @ApiOperation({ summary: 'Update a job posting' })
  async updateJob(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
    @CurrentUser('id') userId: string,
  ) {
    const job = await this.jobService.updateJob(id, updateJobDto, userId);
    return { statusCode: HttpStatus.OK, data: job, message: 'Job updated successfully' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('client', 'admin')
  @ApiOperation({ summary: 'Delete a job posting' })
  async deleteJob(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.jobService.deleteJob(id, userId);
    return { statusCode: HttpStatus.OK, message: 'Job deleted successfully' };
  }

  @Post(':id/proposals')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('freelancer', 'admin')
  @ApiOperation({ summary: 'Submit a proposal for a job' })
  async createProposal(
    @Param('id') jobId: string,
    @Body() createProposalDto: CreateProposalDto,
    @CurrentUser('id') userId: string,
  ) {
    const proposal = await this.jobService.createProposal(jobId, createProposalDto, userId);
    return { statusCode: HttpStatus.CREATED, data: proposal, message: 'Proposal submitted successfully' };
  }

  @Get(':id/proposals')
  @ApiOperation({ summary: 'Get all proposals for a job' })
  async getJobProposals(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const proposals = await this.jobService.getJobProposals(id, userId);
    return { statusCode: HttpStatus.OK, data: proposals };
  }
}
