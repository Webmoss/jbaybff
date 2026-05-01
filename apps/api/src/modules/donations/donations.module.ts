import { Module } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { PaystackClientService } from './paystack-client.service';
import { PaystackWebhookController } from './paystack-webhook.controller';
import { AuthModule } from '../auth/auth.module';
import { ShopModule } from '../shop/shop.module';

@Module({
  imports: [AuthModule, ShopModule],
  controllers: [DonationsController, PaystackWebhookController],
  providers: [DonationsService, PaystackClientService],
})
export class DonationsModule {}
