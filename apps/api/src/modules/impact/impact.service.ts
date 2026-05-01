import { Injectable } from '@nestjs/common';
import { DonationStatus, EventStatus, VolunteerStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type ReportRange = {
  from?: Date;
  to?: Date;
};

@Injectable()
export class ImpactService {
  constructor(private readonly prisma: PrismaService) {}

  async publicSummary() {
    const [campaigns, actions, events, donations, checkIns, totalRaised] = await Promise.all([
      this.prisma.campaign.count({ where: { published: true, status: 'ACTIVE' } }),
      this.prisma.action.count({ where: { published: true, status: 'ACTIVE' } }),
      this.prisma.communityEvent.count({ where: { published: true, status: EventStatus.PUBLISHED } }),
      this.prisma.donation.count({ where: { status: DonationStatus.COMPLETED } }),
      this.prisma.volunteerRsvp.count({ where: { status: VolunteerStatus.CHECKED_IN } }),
      this.prisma.donation.aggregate({
        where: { status: DonationStatus.COMPLETED },
        _sum: { amount: true },
      }),
    ]);

    return {
      activeCampaigns: campaigns,
      activeActions: actions,
      publishedEvents: events,
      completedDonations: donations,
      volunteerCheckIns: checkIns,
      totalRaised: totalRaised._sum.amount ?? 0,
      currency: 'ZAR',
    };
  }

  async adminSummary(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [donations, actions, submissions, eventRsvps, kpi] = await Promise.all([
      this.prisma.donation.count({ where: { status: DonationStatus.COMPLETED, createdAt: { gte: since } } }),
      this.prisma.action.count({ where: { createdAt: { gte: since } } }),
      this.prisma.actionSubmission.count({ where: { createdAt: { gte: since } } }),
      this.prisma.volunteerRsvp.count({ where: { createdAt: { gte: since } } }),
      this.prisma.kpiEvent.groupBy({
        by: ['eventName'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);
    return {
      days,
      since,
      donations,
      actions,
      actionSubmissions: submissions,
      eventRsvps,
      kpi: kpi.map((row) => ({ eventName: row.eventName, count: row._count._all })),
    };
  }

  async adminReportSummary(range: ReportRange) {
    const [donationCount, donationSum, actionSubmissionCount, rsvpCount, kpiCount] = await Promise.all([
      this.prisma.donation.count({
        where: {
          status: DonationStatus.COMPLETED,
          ...this.createdAtWhere(range),
        },
      }),
      this.prisma.donation.aggregate({
        where: {
          status: DonationStatus.COMPLETED,
          ...this.createdAtWhere(range),
        },
        _sum: { amount: true },
      }),
      this.prisma.actionSubmission.count({
        where: this.createdAtWhere(range),
      }),
      this.prisma.volunteerRsvp.count({
        where: this.createdAtWhere(range),
      }),
      this.prisma.kpiEvent.count({
        where: this.createdAtWhere(range),
      }),
    ]);

    return {
      range: {
        from: range.from?.toISOString() ?? null,
        to: range.to?.toISOString() ?? null,
      },
      donations: {
        count: donationCount,
        totalAmount: donationSum._sum.amount ?? 0,
        currency: 'ZAR',
      },
      engagement: {
        actionSubmissions: actionSubmissionCount,
        eventRsvps: rsvpCount,
        kpiEvents: kpiCount,
      },
    };
  }

  async adminDonationsCsv(range: ReportRange) {
    const rows = await this.prisma.donation.findMany({
      where: {
        status: DonationStatus.COMPLETED,
        ...this.createdAtWhere(range),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: {
          select: { id: true, title: true, slug: true },
        },
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    });

    const header = [
      'id',
      'createdAt',
      'amount',
      'currency',
      'donorEmail',
      'donorName',
      'userId',
      'userEmail',
      'userName',
      'campaignId',
      'campaignTitle',
      'campaignSlug',
      'paystackReference',
      'paymentIntentId',
      'status',
    ];

    return this.toCsv(
      header,
      rows.map((row) => [
        row.id,
        row.createdAt.toISOString(),
        row.amount,
        row.currency,
        row.donorEmail,
        row.donorName,
        row.userId,
        row.user?.email,
        row.user?.name,
        row.campaignId,
        row.campaign?.title,
        row.campaign?.slug,
        row.paystackReference,
        row.paymentIntentId,
        row.status,
      ]),
    );
  }

  async adminEngagementCsv(range: ReportRange) {
    const [actionRows, rsvpRows, kpiRows] = await Promise.all([
      this.prisma.actionSubmission.findMany({
        where: this.createdAtWhere(range),
        orderBy: { createdAt: 'desc' },
        include: {
          action: { select: { id: true, title: true, slug: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.volunteerRsvp.findMany({
        where: this.createdAtWhere(range),
        orderBy: { createdAt: 'desc' },
        include: {
          event: { select: { id: true, title: true, slug: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.kpiEvent.findMany({
        where: this.createdAtWhere(range),
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const header = [
      'type',
      'id',
      'createdAt',
      'userId',
      'userEmail',
      'userName',
      'email',
      'name',
      'refId',
      'refTitle',
      'refSlug',
      'statusOrEvent',
      'metadata',
    ];

    const lines: unknown[][] = [];

    for (const row of actionRows) {
      lines.push([
        'ACTION_SUBMISSION',
        row.id,
        row.createdAt.toISOString(),
        row.userId,
        row.user?.email,
        row.user?.name,
        row.email,
        row.name,
        row.actionId,
        row.action?.title,
        row.action?.slug,
        null,
        row.metadata ? JSON.stringify(row.metadata) : null,
      ]);
    }
    for (const row of rsvpRows) {
      lines.push([
        'EVENT_RSVP',
        row.id,
        row.createdAt.toISOString(),
        row.userId,
        row.user?.email,
        row.user?.name,
        row.email,
        row.name,
        row.eventId,
        row.event?.title,
        row.event?.slug,
        row.status,
        null,
      ]);
    }
    for (const row of kpiRows) {
      lines.push([
        'KPI_EVENT',
        row.id,
        row.createdAt.toISOString(),
        row.userId,
        null,
        null,
        null,
        null,
        row.actionId ?? row.campaignId ?? row.sessionId,
        null,
        row.path,
        row.eventName,
        row.metadata ? JSON.stringify(row.metadata) : null,
      ]);
    }

    return this.toCsv(header, lines);
  }

  private createdAtWhere(range: ReportRange) {
    if (!range.from && !range.to) return {};
    return {
      createdAt: {
        ...(range.from ? { gte: range.from } : {}),
        ...(range.to ? { lte: range.to } : {}),
      },
    };
  }

  private toCsv(header: string[], rows: unknown[][]) {
    const escapeCsv = (value: unknown) => {
      const normalized = value === null || value === undefined ? '' : String(value);
      return `"${normalized.replace(/"/g, '""')}"`;
    };
    return [header.join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n');
  }
}
