import * as crypto from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DonationStatus, Prisma, RecurringDonationInterval, RecurringDonationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreateRecurringCheckoutDto } from './dto/create-recurring-checkout.dto';
import { CreateRecurringPlanDto } from './dto/create-recurring-plan.dto';
import { RecoverRecurringPlanDto } from './dto/recover-recurring-plan.dto';
import { RunRecurringCycleDto } from './dto/run-recurring-cycle.dto';
import { PaystackClientService } from './paystack-client.service';

const RECURRING_RUNNER_LOCK_KEY = 'donations:recurring-runner';

@Injectable()
export class DonationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DonationsService.name);
  private recurringTimer?: NodeJS.Timeout;
  private recurringInFlight = false;
  private recurringSchedulerEnabled = false;
  private recurringIntervalMs = 15 * 60_000;
  private recurringBatchSize = 25;
  private recurringDryRun = false;
  private lastRecurringRun: {
    at: string;
    inspected: number;
    charged: number;
    failed: number;
    paused: number;
    dryRun: boolean;
  } | null = null;
  private lastRecurringError: { at: string; message: string } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackClientService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  onModuleInit() {
    this.recurringSchedulerEnabled =
      this.cfg.get<string>('DONATIONS_RECURRING_RUNNER_ENABLED') === 'true';
    this.recurringIntervalMs = this.parsePositiveInt(
      this.cfg.get<string>('DONATIONS_RECURRING_RUNNER_INTERVAL_MS'),
      15 * 60_000,
    );
    this.recurringBatchSize = this.parsePositiveInt(
      this.cfg.get<string>('DONATIONS_RECURRING_RUNNER_BATCH_SIZE'),
      25,
    );
    this.recurringDryRun =
      this.cfg.get<string>('DONATIONS_RECURRING_RUNNER_DRY_RUN') === 'true';

    if (!this.recurringSchedulerEnabled) {
      this.logger.log(
        'Recurring runner disabled (DONATIONS_RECURRING_RUNNER_ENABLED != "true")',
      );
      return;
    }

    this.recurringTimer = setInterval(() => {
      void this.runScheduledRecurringCycle();
    }, this.recurringIntervalMs);
    this.recurringTimer.unref?.();
    this.logger.log(
      `Recurring runner started (interval ${this.recurringIntervalMs}ms, batch ${this.recurringBatchSize})`,
    );
  }

  onModuleDestroy() {
    if (!this.recurringTimer) return;
    clearInterval(this.recurringTimer);
    this.recurringTimer = undefined;
    this.logger.log('Recurring runner stopped');
  }

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

  mineRecurringPlans(userId: string) {
    return this.prisma.recurringDonationPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: {
          select: { id: true, title: true, slug: true },
        },
      },
    });
  }

  listRecurringAdmin() {
    return this.prisma.recurringDonationPlan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: true,
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    });
  }

  async getRecurringReconciliationReport(days = 30) {
    const safeDays = Number.isFinite(days) && days > 0 ? Math.min(Math.floor(days), 180) : 30;
    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

    const [allPlans, recurringDonations] = await Promise.all([
      this.prisma.recurringDonationPlan.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: { select: { id: true, title: true, slug: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.donation.findMany({
        where: {
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ]);
    const recurringCycleDonations = recurringDonations.filter((row) => {
      const meta =
        typeof row.metadata === 'object' && row.metadata !== null && !Array.isArray(row.metadata) ?
          (row.metadata as Record<string, unknown>)
        : null;
      return meta?.source === 'recurring-cycle';
    });

    const setupPending = allPlans.filter(
      (p) => p.status === RecurringDonationStatus.PAUSED && !p.paystackAuthorizationCode && Boolean(p.paystackSetupReference),
    ).length;
    const setupActive = allPlans.filter((p) => Boolean(p.paystackAuthorizationCode)).length;
    const atRiskPlans = allPlans
      .filter(
        (p) =>
          p.status === RecurringDonationStatus.PAUSED ||
          p.failedChargeAttempts > 0 ||
          Boolean(p.lastChargeError),
      )
      .slice(0, 100)
      .map((p) => ({
        id: p.id,
        donorEmail: p.donorEmail,
        donorName: p.donorName,
        status: p.status,
        interval: p.interval,
        amount: p.amount,
        failedChargeAttempts: p.failedChargeAttempts,
        lastChargeError: p.lastChargeError,
        nextChargeAt: p.nextChargeAt,
        campaign: p.campaign ? { id: p.campaign.id, title: p.campaign.title, slug: p.campaign.slug } : null,
      }));

    return {
      windowDays: safeDays,
      since: since.toISOString(),
      totals: {
        plans: allPlans.length,
        active: allPlans.filter((p) => p.status === RecurringDonationStatus.ACTIVE).length,
        paused: allPlans.filter((p) => p.status === RecurringDonationStatus.PAUSED).length,
        cancelled: allPlans.filter((p) => p.status === RecurringDonationStatus.CANCELLED).length,
        setupPending,
        setupActive,
        chargesSettled: recurringCycleDonations.length,
        chargesFailedSignals: allPlans.filter((p) => p.failedChargeAttempts > 0).length,
      },
      recentCharges: recurringCycleDonations.slice(0, 20).map((d) => ({
        id: d.id,
        reference: d.paystackReference,
        amount: d.amount,
        currency: d.currency,
        createdAt: d.createdAt,
        campaignId: d.campaignId,
      })),
      atRiskPlans,
    };
  }

  getRecurringRunnerHealth() {
    return {
      enabled: this.recurringSchedulerEnabled,
      running: Boolean(this.recurringTimer),
      inFlight: this.recurringInFlight,
      config: {
        intervalMs: this.recurringIntervalMs,
        batchSize: this.recurringBatchSize,
        dryRun: this.recurringDryRun,
      },
      lastRun: this.lastRecurringRun,
      lastError: this.lastRecurringError,
    };
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

  async createRecurringPlan(dto: CreateRecurringPlanDto, authorizationHeader?: string) {
    const userId = this.tryUserIdFromAuth(authorizationHeader);
    if (dto.campaignId) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: dto.campaignId },
        select: { id: true },
      });
      if (!campaign) throw new NotFoundException('Campaign not found');
    }

    const interval = dto.interval ?? RecurringDonationInterval.MONTHLY;
    const nextChargeAt = this.deriveNextChargeAt(interval);
    return this.prisma.recurringDonationPlan.create({
      data: {
        userId,
        donorEmail: dto.email.toLowerCase(),
        donorName: dto.name?.trim() || null,
        amount: new Prisma.Decimal(dto.amount.toFixed(2)),
        currency: 'ZAR',
        interval,
        status: RecurringDonationStatus.ACTIVE,
        campaignId: dto.campaignId ?? null,
        paystackAuthorizationCode: dto.authorizationCode?.trim() || null,
        nextChargeAt,
        metadata: {
          source: 'recurring-plan-mvp',
          requestedAt: new Date().toISOString(),
        },
      },
      include: {
        campaign: {
          select: { id: true, title: true, slug: true },
        },
      },
    });
  }

  async startRecurringCheckout(dto: CreateRecurringCheckoutDto, authorizationHeader?: string) {
    const userId = this.tryUserIdFromAuth(authorizationHeader);
    if (dto.campaignId) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: dto.campaignId },
        select: { id: true },
      });
      if (!campaign) throw new NotFoundException('Campaign not found');
    }

    const amountCents = Math.round(Number(dto.amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 100) {
      throw new BadRequestException('Amount must be at least R1.00');
    }

    const interval = dto.interval ?? RecurringDonationInterval.MONTHLY;
    const callbackBase =
      this.cfg.get<string>('PAYSTACK_RECURRING_CALLBACK_URL') ??
      this.cfg.get<string>('PAYSTACK_CALLBACK_URL') ??
      'http://localhost:5173/dashboard';
    const callbackUrl = `${callbackBase.replace(/\/$/, '')}?recurringSetup=1&ref=`;
    const reference = await this.allocateRecurringSetupReference();
    const publicKey = this.cfg.get<string>('PAYSTACK_PUBLIC_KEY') ?? '';

    const plan = await this.prisma.recurringDonationPlan.create({
      data: {
        userId,
        donorEmail: dto.email.toLowerCase(),
        donorName: dto.name?.trim() || null,
        amount: new Prisma.Decimal(dto.amount.toFixed(2)),
        currency: 'ZAR',
        interval,
        status: RecurringDonationStatus.PAUSED,
        campaignId: dto.campaignId ?? null,
        paystackSetupReference: reference,
        nextChargeAt: null,
        metadata: {
          source: 'recurring-plan-setup',
          setupStatus: 'PENDING',
          requestedAt: new Date().toISOString(),
        },
      },
      include: {
        campaign: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    try {
      const init = await this.paystack.initializeTransaction({
        email: dto.email,
        amountCents,
        reference,
        callbackUrl: `${callbackUrl}${encodeURIComponent(reference)}`,
        metadata: {
          source: 'recurring-plan-setup',
          recurringPlanId: plan.id,
        },
      });

      return {
        authorizationUrl: init.authorizationUrl,
        reference: init.reference,
        recurringPlanId: plan.id,
        publicKey,
      };
    } catch (err) {
      await this.prisma.recurringDonationPlan.delete({ where: { id: plan.id } }).catch(() => undefined);
      throw err;
    }
  }

  async runRecurringCycle(dto: RunRecurringCycleDto, actorEmail = 'system@local') {
    const lockAcquired = await this.acquireJobLock(RECURRING_RUNNER_LOCK_KEY);
    if (!lockAcquired) {
      await this.recordAudit('recurring.run.skipped-lock', actorEmail, {
        reason: 'lock-busy',
        dryRun: dto.dryRun ?? false,
      });
      return {
        dryRun: dto.dryRun ?? false,
        inspected: 0,
        charged: 0,
        failed: 0,
        paused: 0,
        details: [],
        skipped: true,
        reason: 'lock-busy',
      };
    }

    try {
    const limit = dto.limit ?? 25;
    const dryRun = dto.dryRun ?? false;
    const now = new Date();
    const duePlans = await this.prisma.recurringDonationPlan.findMany({
      where: {
        status: RecurringDonationStatus.ACTIVE,
        nextChargeAt: { lte: now },
      },
      orderBy: { nextChargeAt: 'asc' },
      take: limit,
    });

    if (dryRun) {
      await this.recordAudit('recurring.run.dry', actorEmail, {
        inspected: duePlans.length,
        limit,
      });
      return {
        dryRun: true,
        inspected: duePlans.length,
        duePlanIds: duePlans.map((row) => row.id),
      };
    }

    let charged = 0;
    let failed = 0;
    let paused = 0;
    const details: Array<{ planId: string; ok: boolean; reason?: string }> = [];

    for (const plan of duePlans) {
      if (!plan.paystackAuthorizationCode) {
        await this.markRecurringFailure(plan.id, 'Missing authorization code');
        failed += 1;
        const latest = await this.prisma.recurringDonationPlan.findUnique({ where: { id: plan.id } });
        if (latest?.status === RecurringDonationStatus.PAUSED) paused += 1;
        details.push({ planId: plan.id, ok: false, reason: 'missing-authorization' });
        continue;
      }

      const reference = await this.allocatePaystackReference();
      const amountCents = Math.round(Number(plan.amount) * 100);
      const charge = await this.paystack.chargeAuthorization({
        email: plan.donorEmail,
        amountCents,
        authorizationCode: plan.paystackAuthorizationCode,
        reference,
        metadata: {
          source: 'recurring-cycle',
          planId: plan.id,
        },
      });

      if (!charge.ok) {
        await this.markRecurringFailure(plan.id, charge.message ?? charge.status);
        failed += 1;
        const latest = await this.prisma.recurringDonationPlan.findUnique({ where: { id: plan.id } });
        if (latest?.status === RecurringDonationStatus.PAUSED) paused += 1;
        details.push({ planId: plan.id, ok: false, reason: charge.message ?? charge.status });
        continue;
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.donation.create({
          data: {
            userId: plan.userId,
            donorEmail: plan.donorEmail,
            donorName: plan.donorName,
            amount: plan.amount,
            currency: plan.currency,
            campaignId: plan.campaignId,
            paystackReference: reference,
            paymentIntentId: charge.id ?? null,
            status: DonationStatus.COMPLETED,
            metadata: {
              source: 'recurring-cycle',
              planId: plan.id,
              chargedAt: now.toISOString(),
            } as Prisma.InputJsonValue,
          },
        });

        if (plan.campaignId) {
          await tx.campaign.update({
            where: { id: plan.campaignId },
            data: { raisedAmount: { increment: plan.amount } },
          });
        }

        await tx.recurringDonationPlan.update({
          where: { id: plan.id },
          data: {
            failedChargeAttempts: 0,
            lastChargeError: null,
            lastChargedAt: now,
            lastChargeReference: reference,
            nextChargeAt: this.deriveNextChargeAtFrom(plan.interval, now),
          },
        });
      });
      charged += 1;
      details.push({ planId: plan.id, ok: true });
    }

    const summary = {
      dryRun: false,
      inspected: duePlans.length,
      charged,
      failed,
      paused,
      details,
    };
    await this.recordAudit('recurring.run.execute', actorEmail, {
      inspected: summary.inspected,
      charged: summary.charged,
      failed: summary.failed,
      paused: summary.paused,
      limit,
    });
    return summary;
    } finally {
      await this.releaseJobLock(RECURRING_RUNNER_LOCK_KEY);
    }
  }

  async updateRecurringPlanStatus(
    planId: string,
    status: RecurringDonationStatus,
    actorUserId: string | null,
    adminOverride: boolean,
  ) {
    const plan = await this.prisma.recurringDonationPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException('Recurring plan not found');
    if (!adminOverride && plan.userId !== actorUserId) {
      throw new ForbiddenException('Not authorized to update this recurring plan');
    }

    const nextChargeAt =
      status === RecurringDonationStatus.ACTIVE ? this.deriveNextChargeAt(plan.interval) : null;
    const cancelledAt = status === RecurringDonationStatus.CANCELLED ? new Date() : null;

    return this.prisma.recurringDonationPlan.update({
      where: { id: planId },
      data: {
        status,
        nextChargeAt,
        cancelledAt,
      },
      include: {
        campaign: {
          select: { id: true, title: true, slug: true },
        },
      },
    });
  }

  async recoverRecurringPlan(planId: string, actorEmail: string, dto: RecoverRecurringPlanDto) {
    const plan = await this.prisma.recurringDonationPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Recurring plan not found');

    const activate = dto.activate ?? true;
    const clearFailures = dto.clearFailures ?? true;
    const forceChargeNow = dto.forceChargeNow ?? false;

    if (activate && !plan.paystackAuthorizationCode) {
      throw new BadRequestException('Cannot activate recurring plan without authorization code');
    }

    const nextChargeAt =
      !activate ? plan.nextChargeAt
      : forceChargeNow ? new Date()
      : this.deriveNextChargeAt(plan.interval);

    const updated = await this.prisma.recurringDonationPlan.update({
      where: { id: planId },
      data: {
        status: activate ? RecurringDonationStatus.ACTIVE : plan.status,
        nextChargeAt,
        failedChargeAttempts: clearFailures ? 0 : plan.failedChargeAttempts,
        lastChargeError: clearFailures ? null : plan.lastChargeError,
      },
      include: {
        campaign: { select: { id: true, title: true, slug: true } },
      },
    });

    await this.recordAudit('recurring.plan.recover', actorEmail, {
      planId,
      activate,
      clearFailures,
      forceChargeNow,
      statusAfter: updated.status,
    });

    return updated;
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

  async verifyRecurringSetup(reference: string) {
    const plan = await this.prisma.recurringDonationPlan.findUnique({
      where: { paystackSetupReference: reference },
      include: {
        campaign: { select: { id: true, title: true, slug: true } },
      },
    });
    if (!plan) throw new NotFoundException('Recurring plan setup not found');

    if (plan.status === RecurringDonationStatus.ACTIVE && plan.paystackAuthorizationCode) {
      return { status: 'active', plan };
    }

    const remote = await this.paystack.verifyTransaction(reference);
    if (!remote.ok) {
      return { status: 'pending', plan };
    }

    await this.settleRecurringSetupByReference(reference, remote.authorizationCode, remote.customerCode);
    const updated = await this.prisma.recurringDonationPlan.findUniqueOrThrow({
      where: { paystackSetupReference: reference },
      include: {
        campaign: { select: { id: true, title: true, slug: true } },
      },
    });
    return { status: updated.status.toLowerCase(), plan: updated };
  }

  async handlePaystackWebhook(body: Record<string, unknown>) {
    const event = typeof body.event === 'string' ? body.event : '';
    if (event !== 'charge.success') {
      return { received: true, ignored: event || 'unknown' };
    }

    const data = body.data as { reference?: string; id?: number } | undefined;
    const reference = data?.reference;
    if (!reference) return { received: true, ignored: 'no-reference' };

    const source =
      typeof (data as { metadata?: { source?: string } }).metadata?.source === 'string' ?
        (data as { metadata?: { source?: string } }).metadata?.source
      : '';

    const remote = await this.paystack.verifyTransaction(reference);
    if (source === 'recurring-plan-setup' || reference.startsWith('jbr_')) {
      if (!remote.ok) {
        await this.prisma.recurringDonationPlan.updateMany({
          where: {
            paystackSetupReference: reference,
            status: RecurringDonationStatus.PAUSED,
          },
          data: {
            lastChargeError: 'Recurring setup payment was not successful',
            metadata: {
              setupStatus: 'FAILED',
              failedAt: new Date().toISOString(),
            } as Prisma.InputJsonValue,
          },
        });
        return { received: true, note: 'recurring-setup-verify-failed' };
      }

      await this.settleRecurringSetupByReference(
        reference,
        remote.authorizationCode,
        remote.customerCode,
      );
      return { received: true, settledRecurringSetup: reference };
    }

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

  private async settleRecurringSetupByReference(
    reference: string,
    authorizationCode?: string,
    customerCode?: string,
  ) {
    const plan = await this.prisma.recurringDonationPlan.findUnique({
      where: { paystackSetupReference: reference },
    });
    if (!plan) return;
    if (plan.status === RecurringDonationStatus.ACTIVE && plan.paystackAuthorizationCode) return;
    if (!authorizationCode) {
      await this.prisma.recurringDonationPlan.update({
        where: { id: plan.id },
        data: {
          lastChargeError: 'Authorization code not returned by Paystack',
          metadata: this.withMergedMetadata(plan.metadata, {
            setupStatus: 'FAILED',
            failedAt: new Date().toISOString(),
          }),
        },
      });
      return;
    }

    await this.prisma.recurringDonationPlan.update({
      where: { id: plan.id },
      data: {
        status: RecurringDonationStatus.ACTIVE,
        paystackAuthorizationCode: authorizationCode,
        paystackCustomerCode: customerCode ?? plan.paystackCustomerCode,
        failedChargeAttempts: 0,
        lastChargeError: null,
        nextChargeAt: this.deriveNextChargeAt(plan.interval),
        metadata: this.withMergedMetadata(plan.metadata, {
          setupStatus: 'COMPLETED',
          setupCompletedAt: new Date().toISOString(),
        }),
      },
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

  private async allocateRecurringSetupReference(): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const candidate = `jbr_${crypto.randomBytes(12).toString('hex')}`;
      const clash = await this.prisma.recurringDonationPlan.findUnique({
        where: { paystackSetupReference: candidate },
      });
      if (!clash) return candidate;
    }
    throw new BadRequestException('Could not allocate recurring setup reference');
  }

  private deriveNextChargeAt(interval: RecurringDonationInterval): Date {
    return this.deriveNextChargeAtFrom(interval, new Date());
  }

  private deriveNextChargeAtFrom(interval: RecurringDonationInterval, fromDate: Date): Date {
    const next = new Date(fromDate);
    if (interval === RecurringDonationInterval.WEEKLY) next.setDate(fromDate.getDate() + 7);
    else if (interval === RecurringDonationInterval.MONTHLY) next.setMonth(fromDate.getMonth() + 1);
    else next.setMonth(fromDate.getMonth() + 3);
    return next;
  }

  private async markRecurringFailure(planId: string, error: string) {
    const plan = await this.prisma.recurringDonationPlan.findUnique({ where: { id: planId } });
    if (!plan) return;
    const failedChargeAttempts = plan.failedChargeAttempts + 1;
    const shouldPause = failedChargeAttempts >= 3;
    await this.prisma.recurringDonationPlan.update({
      where: { id: planId },
      data: {
        failedChargeAttempts,
        lastChargeError: error,
        status: shouldPause ? RecurringDonationStatus.PAUSED : plan.status,
        nextChargeAt: shouldPause ? null : plan.nextChargeAt,
      },
    });
  }

  private async runScheduledRecurringCycle() {
    if (this.recurringInFlight) return;
    this.recurringInFlight = true;
    try {
      const result = await this.runRecurringCycle({
        limit: this.recurringBatchSize,
        dryRun: this.recurringDryRun,
      }, 'system@local');
      this.lastRecurringRun = {
        at: new Date().toISOString(),
        inspected: result.inspected,
        charged: result.charged ?? 0,
        failed: result.failed ?? 0,
        paused: result.paused ?? 0,
        dryRun: result.dryRun,
      };
      this.lastRecurringError = null;
      if ((result.inspected ?? 0) > 0) {
        this.logger.log(
          `Recurring run: inspected=${result.inspected} charged=${result.charged ?? 0} failed=${result.failed ?? 0} paused=${result.paused ?? 0} dryRun=${result.dryRun}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown recurring runner error';
      this.lastRecurringError = { at: new Date().toISOString(), message };
      this.logger.error(`Recurring run failed: ${message}`);
    } finally {
      this.recurringInFlight = false;
    }
  }

  private parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
  }

  private async acquireJobLock(key: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ acquired: number | bigint }>>`
      SELECT GET_LOCK(${key}, 0) AS acquired
    `;
    const acquired = rows[0]?.acquired;
    return acquired === 1 || acquired === BigInt(1);
  }

  private async releaseJobLock(key: string) {
    await this.prisma.$queryRaw`
      SELECT RELEASE_LOCK(${key}) AS released
    `;
  }

  private async recordAudit(action: string, actorEmail: string, metadata: Record<string, unknown>) {
    await this.prisma.adminAuditLog.create({
      data: {
        area: 'donations',
        action,
        actorEmail,
        metadata: metadata as object,
      },
    });
  }

  private withMergedMetadata(
    current: Prisma.JsonValue | null,
    patch: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const base =
      typeof current === 'object' && current !== null && !Array.isArray(current) ?
        (current as Record<string, unknown>)
      : {};
    return {
      ...base,
      ...patch,
    } as Prisma.InputJsonValue;
  }

}
