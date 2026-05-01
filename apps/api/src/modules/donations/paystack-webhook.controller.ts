import { Controller, Headers, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { DonationsService } from './donations.service';
import { ShopService } from '../shop/shop.service';

@Controller('webhooks')
export class PaystackWebhookController {
  constructor(
    private readonly donations: DonationsService,
    private readonly shop: ShopService,
  ) {}

  @Post('paystack')
  @HttpCode(200)
  handle(
    @Req() req: Request,
    @Headers('x-paystack-signature') signature?: string,
  ) {
    const body = req.body as Record<string, unknown>;
    if (!this.donations.verifyPaystackSignature(body, signature)) {
      throw new UnauthorizedException('Invalid Paystack signature');
    }
    const data = body.data as { reference?: string; metadata?: { source?: string } } | undefined;
    const source = data?.metadata?.source ?? '';
    const reference = data?.reference ?? '';
    if (source === 'shop-checkout' || reference.startsWith('jbs_')) {
      return this.shop.handlePaystackWebhook(body);
    }
    return this.donations.handlePaystackWebhook(body);
  }
}
