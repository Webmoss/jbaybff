import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminUpdateSponsorDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  website?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;
}
