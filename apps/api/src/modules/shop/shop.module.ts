import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaystackClientService } from '../donations/paystack-client.service';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

@Module({
  imports: [AuthModule],
  controllers: [ShopController],
  providers: [ShopService, PaystackClientService],
  exports: [ShopService],
})
export class ShopModule {}
