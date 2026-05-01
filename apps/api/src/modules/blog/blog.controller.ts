import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BlogService } from './blog.service';
import { CreateCategoryDto, CreatePostDto, CreateTagDto } from './dto/blog.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('blog')
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Get('public/categories')
  publicCategories() {
    return this.blog.listCategories();
  }

  @Get('public/posts')
  publicPosts() {
    return this.blog.listPublishedPosts();
  }

  @Get('public/posts/:slug')
  publicPost(@Param('slug') slug: string) {
    return this.blog.detailPostBySlug(slug, false);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/posts')
  adminPosts() {
    return this.blog.listAdminPosts();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/categories')
  adminCreateCategory(@Body() dto: CreateCategoryDto) {
    return this.blog.createCategory(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/tags')
  adminTags() {
    return this.blog.listTags();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/tags')
  adminCreateTag(@Body() dto: CreateTagDto) {
    return this.blog.createTag(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/posts')
  adminCreatePost(@Body() dto: CreatePostDto) {
    return this.blog.createPost(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/posts/:id')
  adminUpdatePost(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.blog.updatePost(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/posts/:id')
  adminDeletePost(@Param('id') id: string) {
    return this.blog.deletePost(id);
  }
}
