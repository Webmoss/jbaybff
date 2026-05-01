import { IsEmail, IsNumber, IsOptional, IsString, Max, Min, MaxLength, MinLength } from 'class-validator';

/** Amount is major ZAR units (e.g. 150.50). Paystack expects integer cents server-side. */
export class CreateCheckoutDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsNumber()
  @Min(1, { message: 'Minimum donation is R1' })
  @Max(1_000_000, { message: 'Amount exceeds configured maximum' })
  amount!: number;

  @IsOptional()
  @IsString()
  campaignId?: string;
}
