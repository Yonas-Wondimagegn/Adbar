import { IsString, IsOptional } from 'class-validator';

export class EnableMfaDto {
  @IsString()
  @IsOptional()
  method?: 'totp' | 'sms' = 'totp';
}
