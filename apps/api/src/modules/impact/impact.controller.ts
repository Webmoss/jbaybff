import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ImpactService } from './impact.service';

@Controller('impact')
export class ImpactController {
  constructor(private readonly impact: ImpactService) {}

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
}
