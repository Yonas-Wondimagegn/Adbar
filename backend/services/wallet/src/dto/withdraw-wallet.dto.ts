import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class WithdrawWalletDto {
  @ApiProperty({ description: 'Currency code (e.g. USD, EUR, GBP)', example: 'USD' })
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @ApiProperty({ description: 'Amount to withdraw', example: 50.0 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Payment provider for withdrawal (e.g. stripe, bank_transfer, paypal)', example: 'stripe' })
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @ApiProperty({ description: 'Destination account identifier', example: 'acct_123456789' })
  @IsString()
  @IsNotEmpty()
  destinationAccount!: string;

  @ApiProperty({ description: 'Bank name for the withdrawal', required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ description: 'Optional description for the withdrawal', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
