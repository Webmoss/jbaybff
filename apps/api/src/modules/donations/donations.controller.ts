import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { User, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DonationsService } from './donations.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

interface AuthedRequest extends Request {
  user: User;
}

@Controller('donations')
export class DonationsController {
  constructor(private readonly donations: DonationsService) {}

  /** Guest or logged-in donor — Paystack hosted pay page. */
  @Post('checkout')
  checkout(
    @Body() dto: CreateCheckoutDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.donations.startCheckout(dto, authorization);
  }

  /** After Paystack redirect — safe to poll; webhooks are source of truth. */
  @Get('verify/:reference')
  verify(@Param('reference') reference: string) {
    return this.donations.verifyAndSync(reference);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@Req() req: AuthedRequest) {
    return this.donations.mine(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  adminAll() {
    return this.donations.listAdmin();
  }
}
