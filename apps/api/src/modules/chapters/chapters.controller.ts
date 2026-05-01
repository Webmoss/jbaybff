import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chapters: ChaptersService) {}

  @Get('public')
  listPublic() {
    return this.chapters.listPublic();
  }

  @Get('public/:slug')
  detailPublic(@Param('slug') slug: string) {
    return this.chapters.detailPublic(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  listAdmin() {
    return this.chapters.listAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin')
  createAdmin(@Body() dto: CreateChapterDto) {
    return this.chapters.createAdmin(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/:id')
  updateAdmin(@Param('id') id: string, @Body() dto: UpdateChapterDto) {
    return this.chapters.updateAdmin(id, dto);
  }
}
