import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminUpdateSponsorDto } from './dto/admin-update-sponsor.dto';

type Range = { from?: Date; to?: Date };

@Injectable()
export class SponsorsService {
  constructor(private readonly prisma: PrismaService) {}

  listPublicShowcase() {
    return this.prisma.sponsorProfile.findMany({
      orderBy: { companyName: 'asc' },
    });
  }

  async adminPatch(id: string, dto: AdminUpdateSponsorDto) {
    const exists = await this.prisma.sponsorProfile.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException();

    return this.prisma.sponsorProfile.update({
      where: { id },
      data: {
        ...(dto.companyName !== undefined ? { companyName: dto.companyName } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.website !== undefined ? { website: dto.website } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
      },
    });
  }

  async adminImpactSummary(range: Range) {
    const sponsors = await this.prisma.sponsorProfile.findMany({
      orderBy: { companyName: 'asc' },
      include: {
        campaigns: {
          include: {
            campaign: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    const createdAt =
      range.from || range.to ?
        {
          ...(range.from ? { gte: range.from } : {}),
          ...(range.to ? { lte: range.to } : {}),
        }
      : undefined;

    const rows = await Promise.all(
      sponsors.map((sponsor) =>
        this.computeImpactRow(sponsor.id, sponsor.companyName, sponsor.campaigns.map((row) => row.campaignId), createdAt),
      ),
    );

    const totals = rows.reduce(
      (acc, row) => ({
        sponsors: acc.sponsors + 1,
        campaigns: acc.campaigns + row.campaignCount,
        donations: acc.donations + row.donationCount,
        totalRaised: Number(acc.totalRaised) + Number(row.totalRaised),
        actionSubmissions: acc.actionSubmissions + row.actionSubmissionCount,
        eventRsvps: acc.eventRsvps + row.eventRsvpCount,
      }),
      { sponsors: 0, campaigns: 0, donations: 0, totalRaised: 0, actionSubmissions: 0, eventRsvps: 0 },
    );

    return {
      range: {
        from: range.from?.toISOString() ?? null,
        to: range.to?.toISOString() ?? null,
      },
      currency: 'ZAR',
      totals,
      sponsors: rows,
    };
  }

  async sponsorOwnImpact(userId: string, range: Range) {
    const sponsor = await this.prisma.sponsorProfile.findUnique({
      where: { userId },
      include: {
        campaigns: true,
      },
    });
    if (!sponsor) throw new NotFoundException('Sponsor profile not found');

    const createdAt =
      range.from || range.to ?
        {
          ...(range.from ? { gte: range.from } : {}),
          ...(range.to ? { lte: range.to } : {}),
        }
      : undefined;
    const row = await this.computeImpactRow(
      sponsor.id,
      sponsor.companyName,
      sponsor.campaigns.map((item) => item.campaignId),
      createdAt,
    );

    const campaignDetails = await this.prisma.campaign.findMany({
      where: {
        id: { in: sponsor.campaigns.map((item) => item.campaignId) },
      },
      select: { id: true, title: true, slug: true, status: true, published: true },
      orderBy: { title: 'asc' },
    });

    return {
      range: {
        from: range.from?.toISOString() ?? null,
        to: range.to?.toISOString() ?? null,
      },
      currency: 'ZAR',
      sponsor: row,
      campaigns: campaignDetails,
    };
  }

  async adminImpactCsv(range: Range) {
    const summary = await this.adminImpactSummary(range);
    const header = [
      'sponsorId',
      'companyName',
      'campaignCount',
      'donationCount',
      'totalRaised',
      'currency',
      'actionSubmissionCount',
      'eventRsvpCount',
      'rangeFrom',
      'rangeTo',
    ];

    const rows = summary.sponsors.map((row) => [
      row.sponsorId,
      row.companyName,
      row.campaignCount,
      row.donationCount,
      row.totalRaised,
      summary.currency,
      row.actionSubmissionCount,
      row.eventRsvpCount,
      summary.range.from,
      summary.range.to,
    ]);

    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    return [header.join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n');
  }

  private async computeImpactRow(
    sponsorId: string,
    companyName: string,
    campaignIds: string[],
    createdAt?: { gte?: Date; lte?: Date },
  ) {
    if (!campaignIds.length) {
      return {
        sponsorId,
        companyName,
        campaignCount: 0,
        donationCount: 0,
        totalRaised: 0,
        actionSubmissionCount: 0,
        eventRsvpCount: 0,
      };
    }

    const [donations, donationSum, actionSubmissions, eventRsvps] = await Promise.all([
      this.prisma.donation.count({
        where: {
          status: 'COMPLETED',
          campaignId: { in: campaignIds },
          ...(createdAt ? { createdAt } : {}),
        },
      }),
      this.prisma.donation.aggregate({
        where: {
          status: 'COMPLETED',
          campaignId: { in: campaignIds },
          ...(createdAt ? { createdAt } : {}),
        },
        _sum: { amount: true },
      }),
      this.prisma.actionSubmission.count({
        where: {
          action: { campaignId: { in: campaignIds } },
          ...(createdAt ? { createdAt } : {}),
        },
      }),
      this.prisma.volunteerRsvp.count({
        where: {
          event: { campaignId: { in: campaignIds } },
          ...(createdAt ? { createdAt } : {}),
        },
      }),
    ]);

    return {
      sponsorId,
      companyName,
      campaignCount: campaignIds.length,
      donationCount: donations,
      totalRaised: donationSum._sum.amount ?? 0,
      actionSubmissionCount: actionSubmissions,
      eventRsvpCount: eventRsvps,
    };
  }
}
