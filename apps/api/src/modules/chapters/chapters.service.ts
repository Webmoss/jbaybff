import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../../common/utils/slugify';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

@Injectable()
export class ChaptersService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic() {
    return this.prisma.chapter.findMany({
      where: { active: true },
      include: { events: { where: { published: true }, take: 3, orderBy: { startsAt: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async detailPublic(slug: string) {
    const row = await this.prisma.chapter.findUnique({
      where: { slug },
      include: { events: { where: { published: true }, orderBy: { startsAt: 'asc' } } },
    });
    if (!row || !row.active) throw new NotFoundException();
    return row;
  }

  listAdmin() {
    return this.prisma.chapter.findMany({
      include: { _count: { select: { events: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createAdmin(dto: CreateChapterDto) {
    return this.prisma.chapter.create({
      data: {
        name: dto.name,
        slug: await this.uniqueSlug(dto.slug || dto.name),
        zone: dto.zone,
        description: dto.description,
        contactEmail: dto.contactEmail?.toLowerCase(),
        active: dto.active ?? true,
      },
    });
  }

  async updateAdmin(id: string, dto: UpdateChapterDto) {
    const current = await this.prisma.chapter.findUnique({ where: { id } });
    if (!current) throw new NotFoundException();
    return this.prisma.chapter.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined || dto.name !== undefined ?
          { slug: await this.uniqueSlug(dto.slug || dto.name || current.slug, id) }
        : {}),
        ...(dto.zone !== undefined ? { zone: dto.zone } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.contactEmail !== undefined ? { contactEmail: dto.contactEmail?.toLowerCase() || null } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  private async uniqueSlug(input: string, excludeId?: string) {
    const base = slugify(input || 'chapter');
    let candidate = base;
    for (let i = 1; i < 200; i++) {
      const clash = await this.prisma.chapter.findFirst({
        where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      });
      if (!clash) return candidate;
      candidate = `${base}-${i + 1}`;
    }
    throw new Error('Slug allocation failed');
  }
}
