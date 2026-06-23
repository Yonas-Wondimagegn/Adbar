import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class VerifyPhoneDto {
  @IsPhoneNumber()
  phoneNumber!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
