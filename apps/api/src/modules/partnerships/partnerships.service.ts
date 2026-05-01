import { Injectable, NotFoundException } from '@nestjs/common';
import { PartnershipInquiryStatus, PartnershipType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BulkUpdatePartnershipInquiryDto } from './dto/bulk-update-partnership-inquiry.dto';
import { CreatePartnershipInquiryDto } from './dto/create-partnership-inquiry.dto';
import { UpdatePartnershipInquiryDto } from './dto/update-partnership-inquiry.dto';

@Injectable()
export class PartnershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async submitPublic(dto: CreatePartnershipInquiryDto) {
    const row = await this.prisma.partnershipInquiry.create({
      data: {
        organization: dto.organization.trim(),
        contactName: dto.contactName.trim(),
        contactEmail: dto.contactEmail.toLowerCase().trim(),
        contactPhone: dto.contactPhone?.trim() || null,
        website: dto.website?.trim() || null,
        type: dto.type ?? PartnershipType.CORPORATE,
        message: dto.message?.trim() || null,
        pledgeAmount: dto.pledgeAmount !== undefined ? new Prisma.Decimal(dto.pledgeAmount.toFixed(2)) : null,
        status: PartnershipInquiryStatus.NEW,
      },
    });

    return { ok: true, inquiryId: row.id };
  }

  listAdmin() {
    return this.prisma.partnershipInquiry.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async summaryAdmin() {
    const grouped = await this.prisma.partnershipInquiry.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const base: Record<PartnershipInquiryStatus, number> = {
      NEW: 0,
      IN_REVIEW: 0,
      APPROVED: 0,
      DECLINED: 0,
    };
    for (const row of grouped) {
      base[row.status] = row._count._all;
    }
    return {
      total: Object.values(base).reduce((a, b) => a + b, 0),
      ...base,
    };
  }

  async updateAdmin(id: string, dto: UpdatePartnershipInquiryDto, reviewerEmail?: string) {
    const existing = await this.prisma.partnershipInquiry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Partnership inquiry not found');

    return this.prisma.partnershipInquiry.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedBy: dto.reviewedBy ?? reviewerEmail ?? existing.reviewedBy,
        reviewedAt: new Date(),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async bulkUpdateAdmin(dto: BulkUpdatePartnershipInquiryDto, reviewerEmail?: string) {
    const res = await this.prisma.partnershipInquiry.updateMany({
      where: { id: { in: dto.ids } },
      data: {
        status: dto.status,
        reviewedBy: reviewerEmail ?? null,
        reviewedAt: new Date(),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    return { ok: true, updated: res.count };
  }

  async exportAdminCsv() {
    return this.exportAdminCsvByRange();
  }

  async exportAdminCsvByRange(from?: Date, to?: Date) {
    const createdAtFilter =
      from || to ?
        {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        }
      : undefined;

    const rows = await this.prisma.partnershipInquiry.findMany({
      where: createdAtFilter ? { createdAt: createdAtFilter } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    const header = [
      'id',
      'organization',
      'contactName',
      'contactEmail',
      'contactPhone',
      'website',
      'type',
      'pledgeAmount',
      'status',
      'reviewedBy',
      'reviewedAt',
      'notes',
      'createdAt',
      'updatedAt',
    ];
    const escapeCsv = (value: unknown) => {
      const normalized = value === null || value === undefined ? '' : String(value);
      return `"${normalized.replace(/"/g, '""')}"`;
    };

    const lines = rows.map((row) =>
      [
        row.id,
        row.organization,
        row.contactName,
        row.contactEmail,
        row.contactPhone,
        row.website,
        row.type,
        row.pledgeAmount,
        row.status,
        row.reviewedBy,
        row.reviewedAt?.toISOString(),
        row.notes,
        row.createdAt.toISOString(),
        row.updatedAt.toISOString(),
      ]
        .map(escapeCsv)
        .join(','),
    );

    return [header.join(','), ...lines].join('\n');
  }
}
