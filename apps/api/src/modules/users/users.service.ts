import { Injectable, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { stripPassword } from '../../common/utils/sanitize';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  listAdmin() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        sponsor: true,
      },
    });
  }

  async updateOwnProfile(actorId: string, role: UserRole, dto: UpdateProfileDto) {
    if (dto.name !== undefined) {
      await this.prisma.user.update({
        where: { id: actorId },
        data: { name: dto.name },
      });
    }

    const sponsorPayload =
      dto.companyName !== undefined ||
      dto.companyDescription !== undefined ||
      dto.website !== undefined ||
      dto.logoUrl !== undefined;

    if (sponsorPayload) {
      if (role !== UserRole.SPONSOR) {
        throw new ForbiddenException('Only sponsors have a company profile');
      }

      const existing = await this.prisma.sponsorProfile.findUnique({ where: { userId: actorId } });
      if (!existing) {
        await this.prisma.sponsorProfile.create({
          data: {
            userId: actorId,
            companyName: dto.companyName?.trim()?.length ? dto.companyName.trim() : 'My organization',
            description: dto.companyDescription ?? null,
            website: dto.website ?? null,
            logoUrl: dto.logoUrl ?? null,
          },
        });
      } else {
        await this.prisma.sponsorProfile.update({
          where: { userId: actorId },
          data: {
            ...(dto.companyName !== undefined ? { companyName: dto.companyName.trim() } : {}),
            ...(dto.companyDescription !== undefined ? { description: dto.companyDescription } : {}),
            ...(dto.website !== undefined ? { website: dto.website } : {}),
            ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
          },
        });
      }
    }

    const full = await this.prisma.user.findUniqueOrThrow({
      where: { id: actorId },
      include: { sponsor: true },
    });

    return stripPassword(full);
  }
}
