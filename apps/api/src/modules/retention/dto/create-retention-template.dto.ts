import { RetentionMessageChannel, RetentionTriggerKey } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRetentionTemplateDto {
  @IsEnum(RetentionTriggerKey)
  triggerKey!: RetentionTriggerKey;

  @IsOptional()
  @IsEnum(RetentionMessageChannel)
  channel?: RetentionMessageChannel;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  @MinLength(5)
  body!: string;
}
