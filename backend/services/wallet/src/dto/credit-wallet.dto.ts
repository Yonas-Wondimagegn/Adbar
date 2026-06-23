import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreditWalletDto {
  @ApiProperty({ description: 'Currency code (e.g. USD, EUR, GBP)', example: 'USD' })
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @ApiProperty({ description: 'Amount to credit', example: 100.0 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Optional reference ID for the transaction', required: false })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiProperty({ description: 'Optional description for the credit', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
