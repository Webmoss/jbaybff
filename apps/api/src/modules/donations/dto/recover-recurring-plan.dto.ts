import { IsBoolean, IsOptional } from 'class-validator';

export class RecoverRecurringPlanDto {
  @IsOptional()
  @IsBoolean()
  activate?: boolean;

  @IsOptional()
  @IsBoolean()
  clearFailures?: boolean;

  @IsOptional()
  @IsBoolean()
  forceChargeNow?: boolean;
}
