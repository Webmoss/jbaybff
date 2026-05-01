import { BadRequestException, Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ImpactService } from './impact.service';

@Controller('impact')
export class ImpactController {
  constructor(private readonly impact: ImpactService) {}

  private parseReportRange(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    if ((from && Number.isNaN(fromDate?.getTime())) || (to && Number.isNaN(toDate?.getTime()))) {
      throw new BadRequestException('Invalid report date range');
    }
    return { from: fromDate, to: toDate };
  }

  @Get('public/summary')
  publicSummary() {
    return this.impact.publicSummary();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/summary')
  adminSummary(@Query('days') days?: string) {
    const parsed = Number(days);
    return this.impact.adminSummary(Number.isFinite(parsed) && parsed > 0 ? Math.min(365, parsed) : 30);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/reports/summary')
  reportSummary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.impact.adminReportSummary(this.parseReportRange(from, to));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/reports/donations.csv')
  async donationsCsv(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.impact.adminDonationsCsv(this.parseReportRange(from, to));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="donations-report.csv"');
    res.send(csv);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/reports/engagement.csv')
  async engagementCsv(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.impact.adminEngagementCsv(this.parseReportRange(from, to));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="engagement-report.csv"');
    res.send(csv);
  }
}
