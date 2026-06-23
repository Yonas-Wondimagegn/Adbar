import { IsString, Length, IsEmail } from 'class-validator';

export class VerifyMfaDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  token!: string;
}
