import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Request, Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BulkUpdatePartnershipInquiryDto } from './dto/bulk-update-partnership-inquiry.dto';
import { CreatePartnershipInquiryDto } from './dto/create-partnership-inquiry.dto';
import { UpdatePartnershipInquiryDto } from './dto/update-partnership-inquiry.dto';
import { PartnershipsService } from './partnerships.service';

type MaybeAuthedRequest = Request & { user?: { email?: string } };

@Controller('partnerships')
export class PartnershipsController {
  constructor(private readonly partnerships: PartnershipsService) {}

  @Post('public/inquiries')
  submitPublic(@Body() dto: CreatePartnershipInquiryDto) {
    return this.partnerships.submitPublic(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  listAdmin() {
    return this.partnerships.listAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/summary')
  summaryAdmin() {
    return this.partnerships.summaryAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/export.csv')
  async exportAdmin(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    if ((from && Number.isNaN(fromDate?.getTime())) || (to && Number.isNaN(toDate?.getTime()))) {
      throw new BadRequestException('Invalid date range');
    }
    const csv = await this.partnerships.exportAdminCsvByRange(fromDate, toDate);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="partnership-inquiries.csv"');
    res.send(csv);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/:id')
  updateAdmin(
    @Param('id') id: string,
    @Body() dto: UpdatePartnershipInquiryDto,
    @Req() req: MaybeAuthedRequest,
  ) {
    return this.partnerships.updateAdmin(id, dto, req.user?.email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/bulk')
  bulkUpdateAdmin(@Body() dto: BulkUpdatePartnershipInquiryDto, @Req() req: MaybeAuthedRequest) {
    return this.partnerships.bulkUpdateAdmin(dto, req.user?.email);
  }
}
