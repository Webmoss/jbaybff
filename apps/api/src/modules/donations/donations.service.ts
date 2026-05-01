import * as crypto from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DonationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PaystackClientService } from './paystack-client.service';

@Injectable()
export class DonationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackClientService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  mine(userId: string) {
    return this.prisma.donation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: {
          select: { id: true, title: true, slug: true },
        },
      },
    });
  }

  listAdmin() {
    return this.prisma.donation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: true,
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    });
  }

  /** HMAC SHA512 per https://paystack.com/docs/payments/webhooks/#verifying-webhook-requests */
  verifyPaystackSignature(body: unknown, signatureHeader?: string): boolean {
    const secret = this.cfg.get<string>('PAYSTACK_SECRET_KEY');
    if (!secret || !signatureHeader) return false;
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(body)).digest('hex');
    return hash === signatureHeader;
  }

  /**
   * Public donation checkout — creates a **pending** ledger row then opens Paystack.
   * Settlement + `raisedAmount` bumps happen only in `settleDonationByReference` (webhook / verify).
   */
  async startCheckout(dto: CreateCheckoutDto, authorizationHeader?: string) {
    const userId = this.tryUserIdFromAuth(authorizationHeader);

    if (dto.campaignId) {
      const c = await this.prisma.campaign.findUnique({ where: { id: dto.campaignId }, select: { id: true } });
      if (!c) throw new NotFoundException('Campaign not found');
    }

    const amountDecimal = new Prisma.Decimal(dto.amount.toFixed(2));
    const amountCents = Math.round(Number(dto.amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 100) {
      throw new BadRequestException('Amount must be at least R1.00');
    }

    const callbackBase =
      this.cfg.get<string>('PAYSTACK_CALLBACK_URL') ?? 'http://localhost:5173/donate/thanks';

    const publicKey = this.cfg.get<string>('PAYSTACK_PUBLIC_KEY') ?? '';

    const reference = await this.allocatePaystackReference();

    const donation = await this.prisma.donation.create({
      data: {
        userId,
        donorEmail: dto.email.toLowerCase(),
        donorName: dto.name?.trim() || null,
        amount: amountDecimal,
        currency: 'ZAR',
        campaignId: dto.campaignId ?? null,
        paystackReference: reference,
        status: DonationStatus.PENDING,
        metadata: {
          source: 'paystack-checkout',
          requestedAt: new Date().toISOString(),
        },
      },
    });

    const callbackUrl = `${callbackBase.replace(/\/$/, '')}?ref=${encodeURIComponent(reference)}`;

    try {
      const init = await this.paystack.initializeTransaction({
        email: dto.email,
        amountCents,
        reference,
        callbackUrl,
        metadata: {
          donationId: donation.id,
          campaignId: dto.campaignId ?? '',
        },
      });

      return {
        authorizationUrl: init.authorizationUrl,
        reference: init.reference,
        donationId: donation.id,
        publicKey,
      };
    } catch (err) {
      await this.prisma.donation.delete({ where: { id: donation.id } }).catch(() => undefined);
      throw err;
    }
  }

  /** Browser return-path: reconcile if webhook is delayed. */
  async verifyAndSync(reference: string) {
    const row = await this.prisma.donation.findUnique({
      where: { paystackReference: reference },
      include: { campaign: { select: { id: true, title: true, slug: true } } },
    });
    if (!row) throw new NotFoundException('Donation not found');

    if (row.status === DonationStatus.COMPLETED) {
      return { status: 'completed', donation: row };
    }

    const remote = await this.paystack.verifyTransaction(reference);
    if (remote.ok) {
      await this.settleDonationByReference(reference, remote.id);
      const updated = await this.prisma.donation.findUniqueOrThrow({
        where: { paystackReference: reference },
        include: { campaign: { select: { id: true, title: true, slug: true } } },
      });
      return { status: 'completed', donation: updated };
    }

    return { status: row.status.toLowerCase(), donation: row };
  }

  async handlePaystackWebhook(body: Record<string, unknown>) {
    const event = typeof body.event === 'string' ? body.event : '';
    if (event !== 'charge.success') {
      return { received: true, ignored: event || 'unknown' };
    }

    const data = body.data as { reference?: string; id?: number } | undefined;
    const reference = data?.reference;
    if (!reference) return { received: true, ignored: 'no-reference' };

    const remote = await this.paystack.verifyTransaction(reference);
    if (!remote.ok) {
      await this.prisma.donation
        .updateMany({
          where: { paystackReference: reference, status: DonationStatus.PENDING },
          data: {
            status: DonationStatus.FAILED,
            metadata: { note: 'Paystack verify not success', at: new Date().toISOString() } as Prisma.InputJsonValue,
          },
        })
        .catch(() => undefined);
      return { received: true, note: 'verify-failed' };
    }

    await this.settleDonationByReference(reference, remote.id);
    return { received: true, settled: reference };
  }

  /** Idempotent completion: pending → completed + campaign increment once. */
  private async settleDonationByReference(reference: string, paystackTxnId?: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { paystackReference: reference },
    });
    if (!donation || donation.status !== DonationStatus.PENDING) return;

    const amt = donation.amount;

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.donation.findUnique({ where: { id: donation.id } });
      if (!current || current.status !== DonationStatus.PENDING) return;

      if (current.campaignId) {
        await tx.campaign.update({
          where: { id: current.campaignId },
          data: { raisedAmount: { increment: amt } },
        });
      }

      const prevMeta =
        typeof current.metadata === 'object' && current.metadata !== null && !Array.isArray(current.metadata) ?
          (current.metadata as Record<string, unknown>)
        : {};

      await tx.donation.update({
        where: { id: current.id },
        data: {
          status: DonationStatus.COMPLETED,
          paymentIntentId: paystackTxnId ?? current.paymentIntentId,
          metadata: {
            ...prevMeta,
            settledAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
    });
  }

  private tryUserIdFromAuth(authorizationHeader?: string): string | null {
    if (!authorizationHeader?.startsWith('Bearer ')) return null;
    const token = authorizationHeader.slice(7).trim();
    if (!token) return null;
    try {
      const payload = this.jwt.verify<{ sub: string }>(token);
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  private async allocatePaystackReference(): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const candidate = `jbf_${crypto.randomBytes(12).toString('hex')}`;
      const clash = await this.prisma.donation.findUnique({ where: { paystackReference: candidate } });
      if (!clash) return candidate;
    }
    throw new BadRequestException('Could not allocate payment reference');
  }

}
