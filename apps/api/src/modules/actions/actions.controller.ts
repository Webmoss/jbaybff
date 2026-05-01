import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActionsService } from './actions.service';
import { CreateActionDto } from './dto/create-action.dto';
import { SubmitActionDto } from './dto/submit-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';

interface MaybeAuthedRequest extends Request {
  user?: { id?: string };
}

@Controller('actions')
export class ActionsController {
  constructor(private readonly actions: ActionsService) {}

  @Get('public')
  listPublic() {
    return this.actions.listPublic();
  }

  @Get('public/:slug')
  detailPublic(@Param('slug') slug: string) {
    return this.actions.detailPublic(slug);
  }

  @Post('public/:id/submit')
  submit(@Param('id') id: string, @Body() dto: SubmitActionDto, @Req() req: MaybeAuthedRequest) {
    return this.actions.submit(id, dto, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  listAdmin() {
    return this.actions.listAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin')
  createAdmin(@Body() dto: CreateActionDto) {
    return this.actions.createAdmin(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/:id')
  updateAdmin(@Param('id') id: string, @Body() dto: UpdateActionDto) {
    return this.actions.updateAdmin(id, dto);
  }
}
