import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { slugify } from '../../common/utils/slugify';
import { Prisma } from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public-facing list */
  async listPublished(opts?: { featured?: boolean }) {
    const where: Prisma.CampaignWhereInput = {
      published: true,
      status: 'ACTIVE',
    };
    if (opts?.featured) where.featured = true;

    return this.prisma.campaign.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      include: {
        sponsors: {
          include: {
            sponsor: true,
          },
        },
      },
    });
  }

  async detailBySlug(slug: string, admin = false) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { slug },
      include: {
        sponsors: {
          include: {
            sponsor: true,
          },
        },
      },
    });
    if (!campaign) throw new NotFoundException();

    if (!admin && !(campaign.published && campaign.status === 'ACTIVE')) {
      throw new NotFoundException();
    }

    return campaign;
  }

  listAdmin() {
    return this.prisma.campaign.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        sponsors: {
          include: {
            sponsor: true,
          },
        },
      },
    });
  }

  async adminCreate(dto: CreateCampaignDto) {
    const baseSlug = dto.slug?.trim()?.length ? slugify(dto.slug) : slugify(dto.title);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const published = dto.published ?? false;
    const fundingGoal =
      dto.fundingGoal !== undefined ? new Prisma.Decimal(dto.fundingGoal.toString()) : undefined;

    const campaign = await this.prisma.$transaction(async (tx) => {
      const row = await tx.campaign.create({
        data: {
          title: dto.title,
          slug,
          description: dto.description,
          imageUrl: dto.imageUrl,
          fundingGoal,
          status: dto.status,
          featured: dto.featured ?? false,
          published,
          publishedAt: published ? new Date() : null,
          metaTitle: dto.metaTitle,
          metaDescription: dto.metaDescription,
          ogImageUrl: dto.ogImageUrl,
        },
      });

      if (dto.sponsorIds?.length) {
        await tx.campaignOnSponsors.createMany({
          data: dto.sponsorIds.map((sponsorId) => ({
            campaignId: row.id,
            sponsorId,
          })),
          skipDuplicates: true,
        });
      }

      return row;
    });

    return this.detailBySlug(campaign.slug, true);
  }

  async adminUpdate(id: string, dto: UpdateCampaignDto) {
    const exists = await this.prisma.campaign.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException();

    let slug = exists.slug;
    if (dto.slug !== undefined || dto.title !== undefined) {
      const nextBase =
        dto.slug?.trim()?.length ?
          slugify(dto.slug)
        : dto.title !== undefined ? slugify(dto.title) : slug;
      if (nextBase !== exists.slug) {
        slug = await this.ensureUniqueSlug(nextBase, id);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      let publishedAt = exists.publishedAt;
      const effectivePublished = dto.published !== undefined ? dto.published : exists.published;
      if (dto.published === true && exists.published === false) publishedAt = new Date();

      await tx.campaign.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          slug,
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
          ...(dto.fundingGoal !== undefined ?
            {
              fundingGoal: new Prisma.Decimal(dto.fundingGoal.toString()),
            }
          : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
          ...(dto.published !== undefined ? { published: effectivePublished } : {}),
          publishedAt,
          ...(dto.metaTitle !== undefined ? { metaTitle: dto.metaTitle } : {}),
          ...(dto.metaDescription !== undefined ? { metaDescription: dto.metaDescription } : {}),
          ...(dto.ogImageUrl !== undefined ? { ogImageUrl: dto.ogImageUrl } : {}),
        },
      });

      if (dto.sponsorIds) {
        await tx.campaignOnSponsors.deleteMany({ where: { campaignId: id } });
        if (dto.sponsorIds.length) {
          await tx.campaignOnSponsors.createMany({
            data: dto.sponsorIds.map((sponsorId) => ({
              campaignId: id,
              sponsorId,
            })),
          });
        }
      }
    });

    return this.prisma.campaign.findUniqueOrThrow({
      where: { id },
      include: {
        sponsors: {
          include: {
            sponsor: true,
          },
        },
      },
    });
  }

  async adminDelete(id: string) {
    await this.prisma.campaign.delete({ where: { id } });
    return { ok: true };
  }

  /** Ensure slug uniqueness by appending -2, -3, … */
  private async ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let candidate = base || 'campaign';
    for (let i = 1; ; i++) {
      const clash = await this.prisma.campaign.findFirst({
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
