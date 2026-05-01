import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class LogKpiEventDto {
  @IsString()
  @MaxLength(255)
  eventName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sessionId?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  actionId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
