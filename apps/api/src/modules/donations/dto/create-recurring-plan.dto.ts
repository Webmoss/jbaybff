import { RecurringDonationInterval } from '@prisma/client';
import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateRecurringPlanDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsNumber()
  @Min(1, { message: 'Minimum recurring donation is R1' })
  @Max(1_000_000, { message: 'Amount exceeds configured maximum' })
  amount!: number;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsEnum(RecurringDonationInterval)
  interval?: RecurringDonationInterval;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  authorizationCode?: string;
}
