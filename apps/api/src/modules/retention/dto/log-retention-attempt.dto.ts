import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class LogRetentionAttemptDto {
  @IsBoolean()
  success!: boolean;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  providerRef?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
