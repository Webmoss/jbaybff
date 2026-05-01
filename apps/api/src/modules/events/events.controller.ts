import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { RsvpEventDto } from './dto/rsvp-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

interface MaybeAuthedRequest extends Request {
  user?: { id?: string };
}

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get('public')
  listPublic() {
    return this.events.listPublic();
  }

  @Get('public/:slug')
  detailPublic(@Param('slug') slug: string) {
    return this.events.detailPublic(slug);
  }

  @Post('public/:id/rsvp')
  rsvp(@Param('id') id: string, @Body() dto: RsvpEventDto, @Req() req: MaybeAuthedRequest) {
    return this.events.rsvp(id, dto, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  listAdmin() {
    return this.events.listAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin')
  createAdmin(@Body() dto: CreateEventDto) {
    return this.events.createAdmin(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/:id')
  updateAdmin(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.events.updateAdmin(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/rsvps/:id/checkin')
  checkIn(@Param('id') id: string) {
    return this.events.checkIn(id);
  }
}
