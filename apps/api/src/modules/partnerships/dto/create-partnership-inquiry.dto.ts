import { PartnershipType } from '@prisma/client';
import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePartnershipInquiryDto {
  @IsString()
  @MaxLength(255)
  organization!: string;

  @IsString()
  @MaxLength(255)
  contactName!: string;

  @IsEmail()
  @MaxLength(255)
  contactEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  website?: string;

  @IsOptional()
  @IsEnum(PartnershipType)
  type?: PartnershipType;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pledgeAmount?: number;
}
