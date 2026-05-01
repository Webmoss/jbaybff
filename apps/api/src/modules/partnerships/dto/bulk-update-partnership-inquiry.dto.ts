import { PartnershipInquiryStatus } from '@prisma/client';
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class BulkUpdatePartnershipInquiryDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids!: string[];

  @IsEnum(PartnershipInquiryStatus)
  status!: PartnershipInquiryStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
