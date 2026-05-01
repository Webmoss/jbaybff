import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus, VolunteerStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../../common/utils/slugify';
import { CreateEventDto } from './dto/create-event.dto';
import { RsvpEventDto } from './dto/rsvp-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic() {
    return this.prisma.communityEvent.findMany({
      where: { published: true, status: EventStatus.PUBLISHED },
      include: {
        chapter: { select: { id: true, name: true, slug: true } },
        campaign: { select: { id: true, title: true, slug: true } },
        _count: { select: { rsvps: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async detailPublic(slug: string) {
    const row = await this.prisma.communityEvent.findUnique({
      where: { slug },
      include: {
        chapter: { select: { id: true, name: true, slug: true } },
        campaign: { select: { id: true, title: true, slug: true } },
        _count: { select: { rsvps: true } },
      },
    });
    if (!row || !row.published || row.status !== EventStatus.PUBLISHED) throw new NotFoundException();
    return row;
  }

  listAdmin() {
    return this.prisma.communityEvent.findMany({
      include: {
        chapter: { select: { id: true, name: true } },
        campaign: { select: { id: true, title: true } },
        _count: { select: { rsvps: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createAdmin(dto: CreateEventDto) {
    return this.prisma.communityEvent.create({
      data: {
        title: dto.title,
        slug: await this.uniqueSlug(dto.slug || dto.title),
        description: dto.description,
        location: dto.location,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        capacity: dto.capacity,
        status: dto.status ?? EventStatus.DRAFT,
        published: dto.published ?? false,
        chapterId: dto.chapterId ?? null,
        campaignId: dto.campaignId ?? null,
      },
    });
  }

  async updateAdmin(id: string, dto: UpdateEventDto) {
    const existing = await this.prisma.communityEvent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    return this.prisma.communityEvent.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.slug !== undefined || dto.title !== undefined ?
          { slug: await this.uniqueSlug(dto.slug || dto.title || existing.slug, id) }
        : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.published !== undefined ? { published: dto.published } : {}),
        ...(dto.chapterId !== undefined ? { chapterId: dto.chapterId || null } : {}),
        ...(dto.campaignId !== undefined ? { campaignId: dto.campaignId || null } : {}),
      },
    });
  }

  async rsvp(eventId: string, dto: RsvpEventDto, userId?: string) {
    const event = await this.prisma.communityEvent.findUnique({
      where: { id: eventId },
      include: { _count: { select: { rsvps: true } } },
    });
    if (!event || !event.published || event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('Event not available');
    }
    if (event.capacity && event._count.rsvps >= event.capacity) {
      throw new BadRequestException('Event is full');
    }
    const row = await this.prisma.volunteerRsvp.create({
      data: {
        eventId,
        userId: userId || null,
        email: dto.email.toLowerCase(),
        name: dto.name,
        status: VolunteerStatus.REGISTERED,
      },
    });
    return { ok: true, id: row.id };
  }

  async checkIn(rsvpId: string) {
    return this.prisma.volunteerRsvp.update({
      where: { id: rsvpId },
      data: { status: VolunteerStatus.CHECKED_IN, checkedInAt: new Date() },
    });
  }

  private async uniqueSlug(input: string, excludeId?: string) {
    const base = slugify(input || 'event');
    let candidate = base;
    for (let i = 1; i < 300; i++) {
      const clash = await this.prisma.communityEvent.findFirst({
        where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      });
      if (!clash) return candidate;
      candidate = `${base}-${i + 1}`;
    }
    throw new Error('Event slug allocation failed');
  }
}
