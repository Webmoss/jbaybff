import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { getServerFeatureFlags } from '../../common/config/feature-flags';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

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
      nodeEnv: process.env.NODE_ENV ?? 'development',
    };
  }

  @Get('ready')
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, checks: { database: 'up' } };
    } catch {
      return { ok: false, checks: { database: 'down' } };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('feature-flags')
  featureFlags() {
    return getServerFeatureFlags();
  }
}
