import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsArray, IsIn, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName!: string;

  @ApiPropertyOptional({ example: '+251912345678', description: 'Ethiopian phone (+2519XXXXXXXX) or international E.164' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Phone must be in E.164 format (e.g. +251912345678)' })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: ['BUYER'], description: 'Roles to assign. Default: [BUYER]' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(['BUYER', 'SELLER', 'FREELANCER', 'CLIENT', 'MODERATOR', 'COMPLIANCE_OFFICER', 'ADMIN'], { each: true })
  roles?: string[];
}
