import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

class CheckoutItemDto {
  @IsString()
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateShopCheckoutDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];
}
