import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from './jwt.strategy';
import { RegisterDto } from './dto/register.dto';
import { stripPassword } from '../../common/utils/sanitize';

type SafeUser = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: SafeUser; access_token: string }> {
    if (dto.role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot self-register as admin');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already registered');

    const hash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          name: dto.name,
          password: hash,
          role: dto.role,
        },
      });

      if (dto.role === UserRole.SPONSOR) {
        if (!dto.companyName?.trim()) {
          throw new ForbiddenException('Sponsor registration requires companyName');
        }
        await tx.sponsorProfile.create({
          data: {
            userId: created.id,
            companyName: dto.companyName.trim(),
            description: dto.companyDescription ?? null,
            website: dto.website ?? null,
          },
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: created.id },
        include: { sponsor: true },
      });
    });

    const token = this.sign(user);
    return { user: stripPassword(user), access_token: token };
  }

  async login(email: string, password: string): Promise<{ user: SafeUser; access_token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { sponsor: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const token = this.sign(user);
    return { user: stripPassword(user), access_token: token };
  }

  sign(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwt.sign(payload);
  }
}
