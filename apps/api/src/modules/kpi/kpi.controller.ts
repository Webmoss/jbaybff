import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LogKpiEventDto } from './dto/log-kpi-event.dto';
import { KpiService } from './kpi.service';

interface MaybeAuthedRequest extends Request {
  user?: { id?: string };
}

@Controller('kpi')
export class KpiController {
  constructor(private readonly kpi: KpiService) {}

  @Post('events')
  log(@Body() dto: LogKpiEventDto, @Req() req: MaybeAuthedRequest) {
    return this.kpi.logEvent(dto, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/summary')
  adminSummary(@Query('days') days?: string) {
    const n = Number(days);
    return this.kpi.adminSummary(Number.isFinite(n) && n > 0 ? Math.min(365, n) : 30);
  }
}
