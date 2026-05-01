import { RetentionMessageChannel, RetentionTriggerKey } from '@prisma/client';
import { IsDateString, IsEmail, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueueRetentionMessageDto {
  @IsEnum(RetentionTriggerKey)
  triggerKey!: RetentionTriggerKey;

  @IsEmail()
  toEmail!: string;

  @IsOptional()
  @IsEnum(RetentionMessageChannel)
  channel?: RetentionMessageChannel;

  @IsOptional()
  @IsString()
  templateKey?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;
}
