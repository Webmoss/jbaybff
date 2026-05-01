import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LogKpiEventDto } from './dto/log-kpi-event.dto';

@Injectable()
export class KpiService {
  constructor(private readonly prisma: PrismaService) {}

  async logEvent(dto: LogKpiEventDto, userId?: string) {
    const metadata = dto.metadata as Prisma.InputJsonValue | undefined;
    return this.prisma.kpiEvent.create({
      data: {
        eventName: dto.eventName,
        path: dto.path,
        sessionId: dto.sessionId,
        userId,
        campaignId: dto.campaignId,
        actionId: dto.actionId,
        metadata,
      },
    });
  }

  async adminSummary(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.kpiEvent.groupBy({
      by: ['eventName'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { eventName: 'desc' } },
    });
    const recent = await this.prisma.kpiEvent.findMany({
      where: { createdAt: { gte: since } },
      take: 25,
      orderBy: { createdAt: 'desc' },
    });
    return {
      days,
      since,
      byEvent: rows.map((r) => ({ eventName: r.eventName, count: r._count._all })),
      recent,
    };
  }
}
