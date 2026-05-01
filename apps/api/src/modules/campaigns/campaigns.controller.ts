import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get('public')
  publicList(@Query('featured') featured?: string) {
    return this.campaignsService.listPublished({
      featured: featured === '1' || featured === 'true',
    });
  }

  @Get('public/detail/:slug')
  publicDetail(@Param('slug') slug: string) {
    return this.campaignsService.detailBySlug(slug, false);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  adminList() {
    return this.campaignsService.listAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  adminCreate(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.adminCreate(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/:id')
  adminUpdate(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.adminUpdate(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/:id')
  adminDelete(@Param('id') id: string) {
    return this.campaignsService.adminDelete(id);
  }
}
