import { Controller, Headers, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { DonationsService } from './donations.service';

@Controller('webhooks')
export class PaystackWebhookController {
  constructor(private readonly donations: DonationsService) {}

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
    return this.donations.handlePaystackWebhook(body);
  }
}
