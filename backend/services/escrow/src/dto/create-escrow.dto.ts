import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EscrowStatus {
  PENDING = 'PENDING',
  FUNDED = 'FUNDED',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  FROZEN = 'FROZEN',
  DISPUTED = 'DISPUTED',
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export class MilestoneDto {
  @ApiProperty({ description: 'Milestone title', example: 'Design Phase' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Milestone description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Amount allocated for this milestone', example: 500.0 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Due date for milestone (ISO string)', required: false })
  @IsOptional()
  @IsString()
  dueDate?: string;
}

export class CreateEscrowDto {
  @ApiProperty({ description: 'Contract ID', example: 'contract-uuid' })
  @IsString()
  @IsNotEmpty()
  contractId!: string;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @ApiProperty({ description: 'Total escrow amount', example: 1000.0 })
  @IsNumber()
  @Min(0.01)
  totalAmount!: number;

  @ApiProperty({ description: 'Client ID (payer)', example: 'client-uuid' })
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @ApiProperty({ description: 'Freelancer ID (payee)', example: 'freelancer-uuid' })
  @IsString()
  @IsNotEmpty()
  freelancerId!: string;

  @ApiProperty({ description: 'Project title', example: 'Website Redesign' })
  @IsString()
  @IsNotEmpty()
  projectTitle!: string;

  @ApiProperty({ description: 'Project description', required: false })
  @IsOptional()
  @IsString()
  projectDescription?: string;

  @ApiProperty({ description: 'Commission rate as decimal (e.g. 0.10 for 10%)', example: 0.10 })
  @IsNumber()
  @Min(0)
  commissionRate!: number;

  @ApiProperty({ type: [MilestoneDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones!: MilestoneDto[];
}

export class FundEscrowDto {
  @ApiProperty({ description: 'Payment provider', example: 'stripe' })
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @ApiProperty({ description: 'Payment method ID', example: 'pm_123456' })
  @IsString()
  @IsNotEmpty()
  paymentMethodId!: string;
}

export class ReleaseMilestoneDto {
  @ApiProperty({ description: 'Optional release note', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class RefundEscrowDto {
  @ApiProperty({ description: 'Reason for refund' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiProperty({ description: 'Amount to refund (partial or full)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}
