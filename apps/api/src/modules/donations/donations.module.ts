import { Module } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { PaystackClientService } from './paystack-client.service';
import { PaystackWebhookController } from './paystack-webhook.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DonationsController, PaystackWebhookController],
  providers: [DonationsService, PaystackClientService],
})
export class DonationsModule {}
