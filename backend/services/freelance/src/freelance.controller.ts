import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@adbar/common';
import { CurrentUser } from '@adbar/common';
import { FreelanceService } from './freelance.service';
import {
  CreateProfileDto,
  UpdateProfileDto,
  PortfolioItemDto,
  SkillDto,
  ExperienceDto,
  EducationDto,
  CertificationDto,
  LanguageDto,
  ListFreelancersQueryDto,
} from './dto/freelance.dto';

@ApiTags('freelance')
@Controller('freelance')
export class FreelanceController {
  constructor(private readonly freelanceService: FreelanceService) {}

  // ========== Profile CRUD ==========

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create freelancer profile' })
  async createProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProfileDto,
  ) {
    return this.freelanceService.createProfile(userId, dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own freelancer profile' })
  async getOwnProfile(@CurrentUser('id') userId: string) {
    return this.freelanceService.getProfile(userId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update freelancer profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.freelanceService.updateProfile(userId, dto);
  }

  @Get('profile/:userId')
  @ApiOperation({ summary: 'Get freelancer profile by user ID (public)' })
  async getProfile(@Param('userId') userId: string) {
    return this.freelanceService.getProfile(userId);
  }

  // ========== Portfolio ==========

  @Post('profile/portfolio')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add portfolio item' })
  async addPortfolioItem(
    @CurrentUser('id') userId: string,
    @Body() dto: PortfolioItemDto,
  ) {
    return this.freelanceService.addPortfolioItem(userId, dto);
  }

  @Delete('profile/portfolio/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove portfolio item' })
  @ApiParam({ name: 'itemId', description: 'Portfolio item ID' })
  async removePortfolioItem(
    @CurrentUser('id') userId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.freelanceService.removePortfolioItem(userId, itemId);
  }

  // ========== Skills ==========

  @Post('profile/skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add skill to profile' })
  async addSkill(
    @CurrentUser('id') userId: string,
    @Body() dto: SkillDto,
  ) {
    return this.freelanceService.addSkill(userId, dto);
  }

  @Delete('profile/skills/:skillName')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove skill from profile' })
  @ApiParam({ name: 'skillName', description: 'Skill name to remove' })
  async removeSkill(
    @CurrentUser('id') userId: string,
    @Param('skillName') skillName: string,
  ) {
    return this.freelanceService.removeSkill(userId, skillName);
  }

  // ========== Experience ==========

  @Post('profile/experience')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add work experience' })
  async addExperience(
    @CurrentUser('id') userId: string,
    @Body() dto: ExperienceDto,
  ) {
    return this.freelanceService.addExperience(userId, dto);
  }

  // ========== Education ==========

  @Post('profile/education')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add education' })
  async addEducation(
    @CurrentUser('id') userId: string,
    @Body() dto: EducationDto,
  ) {
    return this.freelanceService.addEducation(userId, dto);
  }

  // ========== Certifications ==========

  @Post('profile/certifications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add certification' })
  async addCertification(
    @CurrentUser('id') userId: string,
    @Body() dto: CertificationDto,
  ) {
    return this.freelanceService.addCertification(userId, dto);
  }

  // ========== Languages ==========

  @Post('profile/languages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add language' })
  async addLanguage(
    @CurrentUser('id') userId: string,
    @Body() dto: LanguageDto,
  ) {
    return this.freelanceService.addLanguage(userId, dto);
  }

  // ========== List & Filter ==========

  @Get('list')
  @ApiOperation({ summary: 'List freelancers with filtering and pagination' })
  @ApiQuery({ name: 'skill', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'minRate', required: false, type: Number })
  @ApiQuery({ name: 'maxRate', required: false, type: Number })
  @ApiQuery({ name: 'availability', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listFreelancers(@Query() query: ListFreelancersQueryDto) {
    return this.freelanceService.listFreelancers(query);
  }
}
