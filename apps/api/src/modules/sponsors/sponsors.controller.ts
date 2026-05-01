import { BadRequestException, Body, Controller, Get, Param, Patch, Query, Req, Res, UseGuards } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import type { Response } from 'express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SponsorsService } from './sponsors.service';
import { AdminUpdateSponsorDto } from './dto/admin-update-sponsor.dto';
import { getServerFeatureFlags } from '../../common/config/feature-flags';

interface AuthedRequest extends Request {
  user: User;
}

@Controller('sponsors')
export class SponsorsController {
  constructor(private readonly sponsors: SponsorsService) {}

  private parseReportRange(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    if ((from && Number.isNaN(fromDate?.getTime())) || (to && Number.isNaN(toDate?.getTime()))) {
      throw new BadRequestException('Invalid report date range');
    }
    return { from: fromDate, to: toDate };
  }

  /** Homepage sponsor strip logos */
  @Get('public')
  publicShowcase() {
    return this.sponsors.listPublicShowcase();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SPONSOR, UserRole.ADMIN)
  @Get('me/impact')
  myImpact(
    @Req() req: AuthedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!getServerFeatureFlags().sponsorImpactSelfService) throw new BadRequestException('Feature is disabled');
    return this.sponsors.sponsorOwnImpact(req.user.id, this.parseReportRange(from, to));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  adminUpdate(@Param('id') id: string, @Body() dto: AdminUpdateSponsorDto) {
    return this.sponsors.adminPatch(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/impact/summary')
  adminImpactSummary(@Query('from') from?: string, @Query('to') to?: string) {
    if (!getServerFeatureFlags().adminSponsorImpactReporting) throw new BadRequestException('Feature is disabled');
    return this.sponsors.adminImpactSummary(this.parseReportRange(from, to));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/impact.csv')
  async adminImpactCsv(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!getServerFeatureFlags().adminSponsorImpactReporting) throw new BadRequestException('Feature is disabled');
    const csv = await this.sponsors.adminImpactCsv(this.parseReportRange(from, to));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sponsor-impact-report.csv"');
    res.send(csv);
  }
}
