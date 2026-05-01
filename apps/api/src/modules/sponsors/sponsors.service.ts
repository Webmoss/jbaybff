import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminUpdateSponsorDto } from './dto/admin-update-sponsor.dto';

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
}
