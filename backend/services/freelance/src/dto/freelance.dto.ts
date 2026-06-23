import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  IsISO8601,
  Min,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProficiencyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  EXPERT = 'expert',
}

export class PortfolioItemDto {
  @ApiProperty({ description: 'Portfolio item title', example: 'E-commerce Platform' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Portfolio item description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Image/preview URL', required: false })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({ description: 'Project URL', required: false })
  @IsOptional()
  @IsUrl()
  projectUrl?: string;

  @ApiProperty({ description: 'Technologies used', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];
}

export class SkillDto {
  @ApiProperty({ description: 'Skill name', example: 'TypeScript' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: ProficiencyLevel, required: false })
  @IsOptional()
  @IsEnum(ProficiencyLevel)
  level?: ProficiencyLevel;

  @ApiProperty({ description: 'Years of experience with this skill', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;
}

export class ExperienceDto {
  @ApiProperty({ description: 'Company name', example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  company!: string;

  @ApiProperty({ description: 'Job title', example: 'Senior Developer' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Start date (ISO 8601)', example: '2020-01-01' })
  @IsString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({ description: 'End date (ISO 8601, null if current)', required: false })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ description: 'Job description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Whether this is current position', default: false })
  @IsOptional()
  @IsNumber()
  isCurrent?: boolean;
}

export class EducationDto {
  @ApiProperty({ description: 'Institution name', example: 'MIT' })
  @IsString()
  @IsNotEmpty()
  institution!: string;

  @ApiProperty({ description: 'Degree/qualification', example: 'BSc Computer Science' })
  @IsString()
  @IsNotEmpty()
  degree!: string;

  @ApiProperty({ description: 'Field of study', example: 'Computer Science' })
  @IsString()
  @IsNotEmpty()
  fieldOfStudy!: string;

  @ApiProperty({ description: 'Start year', example: 2016 })
  @IsNumber()
  @Min(1900)
  startYear!: number;

  @ApiProperty({ description: 'End year (null if ongoing)', required: false })
  @IsOptional()
  @IsNumber()
  endYear?: number;
}

export class CertificationDto {
  @ApiProperty({ description: 'Certification name', example: 'AWS Solutions Architect' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Issuing organization', example: 'Amazon Web Services' })
  @IsString()
  @IsNotEmpty()
  issuer!: string;

  @ApiProperty({ description: 'Issue date (ISO 8601)', example: '2022-06-01' })
  @IsString()
  @IsNotEmpty()
  issueDate!: string;

  @ApiProperty({ description: 'Expiry date (ISO 8601, null if no expiry)', required: false })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiProperty({ description: 'Credential ID', required: false })
  @IsOptional()
  @IsString()
  credentialId?: string;
}

export class LanguageDto {
  @ApiProperty({ description: 'Language name', example: 'English' })
  @IsString()
  @IsNotEmpty()
  language!: string;

  @ApiProperty({ description: 'Proficiency level', example: 'native' })
  @IsString()
  @IsNotEmpty()
  proficiency!: string;
}

export class CreateProfileDto {
  @ApiProperty({ description: 'Professional headline', example: 'Full-Stack Developer' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  headline!: string;

  @ApiProperty({ description: 'Bio/about section', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiProperty({ description: 'Hourly rate in default currency', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiProperty({ description: 'Currency code for hourly rate', example: 'USD', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Primary skills', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ description: 'Portfolio items', required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioItemDto)
  portfolio?: PortfolioItemDto[];

  @ApiProperty({ description: 'Work experience', required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience?: ExperienceDto[];

  @ApiProperty({ description: 'Education history', required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiProperty({ description: 'Certifications', required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];

  @ApiProperty({ description: 'Languages spoken', required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages?: LanguageDto[];

  @ApiProperty({ description: 'Availability status', example: 'available', required: false })
  @IsOptional()
  @IsString()
  availability?: string;
}

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  availability?: string;
}

export class ListFreelancersQueryDto {
  @ApiProperty({ required: false, description: 'Search by skill' })
  @IsOptional()
  @IsString()
  skill?: string;

  @ApiProperty({ required: false, description: 'Search by name or headline' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Filter by minimum hourly rate' })
  @IsOptional()
  @IsNumber()
  minRate?: number;

  @ApiProperty({ required: false, description: 'Filter by maximum hourly rate' })
  @IsOptional()
  @IsNumber()
  maxRate?: number;

  @ApiProperty({ required: false, description: 'Filter by availability' })
  @IsOptional()
  @IsString()
  availability?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
