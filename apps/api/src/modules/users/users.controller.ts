import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { UserRole, type SponsorProfile, type User } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { stripPassword } from '../../common/utils/sanitize';
import { UpdateProfileDto } from './dto/update-profile.dto';

type AuthedUser = User & { sponsor?: SponsorProfile | null };

interface AuthedRequest extends Request {
  user: AuthedUser;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: AuthedRequest) {
    return stripPassword(req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  list() {
    return this.usersService.listAdmin();
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  update(@Req() req: AuthedRequest, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateOwnProfile(req.user.id, req.user.role, dto);
  }
}
