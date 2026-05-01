import { Body, Controller, Get, Headers, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { User, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DonationsService } from './donations.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreateRecurringCheckoutDto } from './dto/create-recurring-checkout.dto';
import { CreateRecurringPlanDto } from './dto/create-recurring-plan.dto';
import { RecoverRecurringPlanDto } from './dto/recover-recurring-plan.dto';
import { RunRecurringCycleDto } from './dto/run-recurring-cycle.dto';
import { UpdateRecurringPlanStatusDto } from './dto/update-recurring-plan-status.dto';
import { getServerFeatureFlags } from '../../common/config/feature-flags';

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

  @UseGuards(JwtAuthGuard)
  @Get('recurring/mine')
  recurringMine(@Req() req: AuthedRequest) {
    if (!getServerFeatureFlags().recurringDonations) throw new NotFoundException();
    return this.donations.mineRecurringPlans(req.user.id);
  }

  @Post('recurring/plan')
  createRecurringPlan(
    @Body() dto: CreateRecurringPlanDto,
    @Headers('authorization') authorization?: string,
  ) {
    if (!getServerFeatureFlags().recurringDonations) throw new NotFoundException();
    return this.donations.createRecurringPlan(dto, authorization);
  }

  @Post('recurring/checkout')
  recurringCheckout(
    @Body() dto: CreateRecurringCheckoutDto,
    @Headers('authorization') authorization?: string,
  ) {
    if (!getServerFeatureFlags().recurringDonations) throw new NotFoundException();
    return this.donations.startRecurringCheckout(dto, authorization);
  }

  @Get('recurring/verify/:reference')
  recurringVerify(@Param('reference') reference: string) {
    if (!getServerFeatureFlags().recurringDonations) throw new NotFoundException();
    return this.donations.verifyRecurringSetup(reference);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('recurring/mine/:id/status')
  updateRecurringMineStatus(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringPlanStatusDto,
  ) {
    if (!getServerFeatureFlags().recurringDonations) throw new NotFoundException();
    return this.donations.updateRecurringPlanStatus(id, dto.status, req.user.id, false);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  adminAll() {
    return this.donations.listAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/recurring')
  adminRecurring() {
    if (!getServerFeatureFlags().recurringDonations) throw new NotFoundException();
    return this.donations.listRecurringAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/recurring/reconciliation')
  adminRecurringReconciliation() {
    if (!getServerFeatureFlags().recurringDonations) throw new NotFoundException();
    return this.donations.getRecurringReconciliationReport();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/recurring/:id/status')
  updateRecurringAdminStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRecurringPlanStatusDto,
  ) {
    if (!getServerFeatureFlags().recurringDonations) throw new NotFoundException();
    return this.donations.updateRecurringPlanStatus(id, dto.status, null, true);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/recurring/:id/recover')
  recoverRecurringPlan(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: RecoverRecurringPlanDto,
  ) {
    if (!getServerFeatureFlags().recurringDonations) throw new NotFoundException();
    return this.donations.recoverRecurringPlan(id, req.user.email ?? 'admin@local', dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/recurring/run')
  runRecurringCycle(@Req() req: AuthedRequest, @Body() dto: RunRecurringCycleDto) {
    if (!getServerFeatureFlags().adminRecurringRunner) throw new NotFoundException();
    return this.donations.runRecurringCycle(dto, req.user.email ?? 'admin@local');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/recurring/runner-health')
  recurringRunnerHealth() {
    if (!getServerFeatureFlags().adminRecurringRunner) throw new NotFoundException();
    return this.donations.getRecurringRunnerHealth();
  }
}
