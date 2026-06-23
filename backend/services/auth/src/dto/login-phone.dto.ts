import { IsPhoneNumber, IsString, IsOptional } from 'class-validator';

export class LoginPhoneDto {
  @IsPhoneNumber()
  phoneNumber!: string;

  @IsString()
  @IsOptional()
  otpCode?: string;
}
