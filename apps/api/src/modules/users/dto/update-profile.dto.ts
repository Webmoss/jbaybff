import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  companyDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  website?: string;

  /** Sponsor logo URL (from media upload endpoint). */
  @IsOptional()
  @IsString()
  logoUrl?: string | null;
}
