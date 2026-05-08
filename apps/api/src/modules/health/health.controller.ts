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
    return {
      ok: true,
      service: 'jbaybff-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  @Get('version')
  version() {
    return {
      service: 'jbaybff-api',
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('feature-flags')
  featureFlags() {
    return getServerFeatureFlags();
  }
}
