import { PartnershipInquiryStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePartnershipInquiryDto {
  @IsEnum(PartnershipInquiryStatus)
  status!: PartnershipInquiryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reviewedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
