import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SponsorsService } from './sponsors.service';
import { AdminUpdateSponsorDto } from './dto/admin-update-sponsor.dto';

@Controller('sponsors')
export class SponsorsController {
  constructor(private readonly sponsors: SponsorsService) {}

  /** Homepage sponsor strip logos */
  @Get('public')
  publicShowcase() {
    return this.sponsors.listPublicShowcase();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  adminUpdate(@Param('id') id: string, @Body() dto: AdminUpdateSponsorDto) {
    return this.sponsors.adminPatch(id, dto);
  }
}
