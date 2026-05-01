import { ShopFulfillmentStatus, ShopOrderStatus, ShopPaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsOptional()
  @IsEnum(ShopOrderStatus)
  status?: ShopOrderStatus;

  @IsOptional()
  @IsEnum(ShopPaymentStatus)
  paymentStatus?: ShopPaymentStatus;

  @IsOptional()
  @IsEnum(ShopFulfillmentStatus)
  fulfillmentStatus?: ShopFulfillmentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  trackingRef?: string;
}
