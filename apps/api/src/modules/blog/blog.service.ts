import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../../common/utils/slugify';
import { CreateCategoryDto, CreatePostDto, CreateTagDto } from './dto/blog.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.blogCategory.findMany({ orderBy: { name: 'asc' } });
  }

  createCategory(dto: CreateCategoryDto) {
    const slug = dto.slug?.trim()?.length ? slugify(dto.slug) : slugify(dto.name);
    return this.prisma.blogCategory.create({ data: { name: dto.name, slug } });
  }

  listTags() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  createTag(dto: CreateTagDto) {
    const slug = dto.slug?.trim()?.length ? slugify(dto.slug) : slugify(dto.name);
    return this.prisma.tag.create({ data: { name: dto.name, slug } });
  }

  listPublishedPosts() {
    return this.prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
      include: { category: true, tags: { include: { tag: true } } },
    });
  }

  async detailPostBySlug(slug: string, admin = false) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: { category: true, tags: { include: { tag: true } } },
    });
    if (!post) throw new NotFoundException();
    if (!admin && !post.published) throw new NotFoundException();
    return post;
  }

  listAdminPosts() {
    return this.prisma.blogPost.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { category: true, tags: { include: { tag: true } } },
    });
  }

  async createPost(dto: CreatePostDto) {
    const baseSlug = dto.slug?.trim()?.length ? slugify(dto.slug) : slugify(dto.title);
    const slug = await this.ensureUniquePostSlug(baseSlug);

    const published = dto.published ?? false;

    const post = await this.prisma.$transaction(async (tx) => {
      const row = await tx.blogPost.create({
        data: {
          title: dto.title,
          slug,
          excerpt: dto.excerpt,
          content: dto.content,
          categoryId: dto.categoryId ?? null,
          published,
          publishedAt: published ? new Date() : null,
          metaTitle: dto.metaTitle,
          metaDescription: dto.metaDescription,
          ogTitle: dto.ogTitle,
          ogDescription: dto.ogDescription,
          ogImageUrl: dto.ogImageUrl,
        },
      });

      if (dto.tagIds?.length) {
        await tx.blogPostOnTags.createMany({
          data: dto.tagIds.map((tagId) => ({ postId: row.id, tagId })),
          skipDuplicates: true,
        });
      }

      return row;
    });

    return this.detailPostBySlug(post.slug, true);
  }

  async updatePost(id: string, dto: UpdatePostDto) {
    const exists = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException();

    let slug = exists.slug;
    if (dto.slug !== undefined || dto.title !== undefined) {
      const nextBase =
        dto.slug?.trim()?.length ?
          slugify(dto.slug)
        : dto.title !== undefined ? slugify(dto.title) : slug;
      if (nextBase !== exists.slug) slug = await this.ensureUniquePostSlug(nextBase, id);
    }

    await this.prisma.$transaction(async (tx) => {
      let publishedAt = exists.publishedAt;
      const effectivePublished = dto.published !== undefined ? dto.published : exists.published;
      if (dto.published === true && exists.published === false) publishedAt = new Date();

      await tx.blogPost.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          slug,
          ...(dto.excerpt !== undefined ? { excerpt: dto.excerpt } : {}),
          ...(dto.content !== undefined ? { content: dto.content } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.published !== undefined ? { published: effectivePublished } : {}),
          publishedAt,
          ...(dto.metaTitle !== undefined ? { metaTitle: dto.metaTitle } : {}),
          ...(dto.metaDescription !== undefined ? { metaDescription: dto.metaDescription } : {}),
          ...(dto.ogTitle !== undefined ? { ogTitle: dto.ogTitle } : {}),
          ...(dto.ogDescription !== undefined ? { ogDescription: dto.ogDescription } : {}),
          ...(dto.ogImageUrl !== undefined ? { ogImageUrl: dto.ogImageUrl } : {}),
        },
      });

      if (dto.tagIds) {
        await tx.blogPostOnTags.deleteMany({ where: { postId: id } });
        if (dto.tagIds.length) {
          await tx.blogPostOnTags.createMany({
            data: dto.tagIds.map((tagId) => ({ postId: id, tagId })),
          });
        }
      }
    });

    return this.prisma.blogPost.findUniqueOrThrow({
      where: { id },
      include: { category: true, tags: { include: { tag: true } } },
    });
  }

  async deletePost(id: string) {
    await this.prisma.blogPost.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureUniquePostSlug(base: string, excludeId?: string): Promise<string> {
    let candidate = base || 'post';
    for (let i = 1; ; i++) {
      const clash = await this.prisma.blogPost.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });
      if (!clash) return candidate;
      candidate = `${base}-${i + 1}`;
      if (i > 900) throw new ConflictException('Could not derive unique slug');
    }
  }
}
