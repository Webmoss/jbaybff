import { Injectable } from '@nestjs/common';
import { DonationStatus, EventStatus, VolunteerStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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
}
