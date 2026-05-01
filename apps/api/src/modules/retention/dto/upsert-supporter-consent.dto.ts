import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpsertSupporterConsentDto {
  @IsEmail()
  email!: string;

  @IsBoolean()
  emailOptIn!: boolean;

  @IsOptional()
  @IsBoolean()
  smsOptIn?: boolean;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
