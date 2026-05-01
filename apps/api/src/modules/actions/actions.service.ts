import { Injectable, NotFoundException } from '@nestjs/common';
import { ActionStatus, ActionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../../common/utils/slugify';
import { CreateActionDto } from './dto/create-action.dto';
import { SubmitActionDto } from './dto/submit-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';

@Injectable()
export class ActionsService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic() {
    return this.prisma.action.findMany({
      where: { published: true, status: ActionStatus.ACTIVE },
      include: { campaign: { select: { id: true, title: true, slug: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async detailPublic(slug: string) {
    const row = await this.prisma.action.findUnique({
      where: { slug },
      include: { campaign: { select: { id: true, title: true, slug: true } } },
    });
    if (!row || !row.published || row.status !== ActionStatus.ACTIVE) throw new NotFoundException();
    return row;
  }

  listAdmin() {
    return this.prisma.action.findMany({
      include: {
        campaign: { select: { id: true, title: true, slug: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createAdmin(dto: CreateActionDto) {
    const slug = await this.uniqueSlug(dto.slug || dto.title);
    return this.prisma.action.create({
      data: {
        title: dto.title,
        slug,
        summary: dto.summary,
        description: dto.description,
        type: dto.type ?? ActionType.PLEDGE,
        status: dto.status ?? ActionStatus.DRAFT,
        targetUrl: dto.targetUrl,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        campaignId: dto.campaignId ?? null,
        published: dto.published ?? false,
      },
    });
  }

  async updateAdmin(id: string, dto: UpdateActionDto) {
    const existing = await this.prisma.action.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    const nextSlug =
      dto.slug || dto.title ? await this.uniqueSlug(dto.slug || dto.title || existing.slug, id) : existing.slug;

    return this.prisma.action.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        slug: nextSlug,
        ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.targetUrl !== undefined ? { targetUrl: dto.targetUrl } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null } : {}),
        ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {}),
        ...(dto.campaignId !== undefined ? { campaignId: dto.campaignId || null } : {}),
        ...(dto.published !== undefined ? { published: dto.published } : {}),
      },
    });
  }

  async submit(actionId: string, dto: SubmitActionDto, userId?: string) {
    const action = await this.prisma.action.findUnique({ where: { id: actionId } });
    if (!action || !action.published || action.status !== ActionStatus.ACTIVE) {
      throw new NotFoundException('Action not available');
    }
    const row = await this.prisma.actionSubmission.create({
      data: {
        actionId,
        userId,
        email: dto.email?.toLowerCase(),
        name: dto.name ?? null,
      },
    });
    return { ok: true, submissionId: row.id };
  }

  private async uniqueSlug(input: string, excludeId?: string): Promise<string> {
    const base = slugify(input || 'action');
    let candidate = base;
    for (let i = 1; i < 500; i++) {
      const clash = await this.prisma.action.findFirst({
        where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      });
      if (!clash) return candidate;
      candidate = `${base}-${i + 1}`;
    }
    throw new Error('Could not allocate action slug');
  }
}
