import { RecurringDonationStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRecurringPlanStatusDto {
  @IsEnum(RecurringDonationStatus)
  status!: RecurringDonationStatus;
}
