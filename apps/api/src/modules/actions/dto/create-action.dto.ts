import { ActionStatus, ActionType } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateActionDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  summary?: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsEnum(ActionType)
  type?: ActionType;

  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  targetUrl?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
