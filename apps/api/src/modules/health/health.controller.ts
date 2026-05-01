import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { getServerFeatureFlags } from '../../common/config/feature-flags';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { ok: true, service: 'jbaybff-api' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('feature-flags')
  featureFlags() {
    return getServerFeatureFlags();
  }
}
