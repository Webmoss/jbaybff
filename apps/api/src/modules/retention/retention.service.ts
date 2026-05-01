import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CampaignStatus,
  DonationStatus,
  RetentionMessageChannel,
  RetentionMessageStatus,
  RetentionTemplate,
  RetentionTriggerKey,
  VolunteerStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type TriggerDefinition = {
  key: RetentionTriggerKey;
  label: string;
  objective: string;
  cadence: string;
  audience: string;
  sourceSignals: string[];
};

type TriggerSnapshot = TriggerDefinition & {
  dueCount: number;
};

type EngagementRow = {
  email: string;
  at: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const RETRY_BASE_MINUTES = 5;

@Injectable()
export class RetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionService.name);
  private dispatchTimer?: NodeJS.Timeout;
  private dispatchInFlight = false;
  private dispatcherEnabled = false;
  private dispatcherIntervalMs = 60_000;
  private dispatcherBatchSize = 20;
  private dispatcherDryRun = false;
  private lastDispatchRun: {
    at: string;
    scanned: number;
    dispatched: number;
    queuedForRetry: number;
    failedFinal: number;
    dryRun: boolean;
  } | null = null;
  private lastDispatchError: { at: string; message: string } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.dispatcherEnabled = this.config.get<string>('RETENTION_DISPATCH_ENABLED') === 'true';
    this.dispatcherIntervalMs = this.parsePositiveInt(this.config.get<string>('RETENTION_DISPATCH_INTERVAL_MS'), 60_000);
    this.dispatcherBatchSize = this.parsePositiveInt(this.config.get<string>('RETENTION_DISPATCH_BATCH_SIZE'), 20);
    this.dispatcherDryRun = this.config.get<string>('RETENTION_DISPATCH_DRY_RUN') === 'true';

    if (!this.dispatcherEnabled) {
      this.logger.log('Retention dispatcher disabled (RETENTION_DISPATCH_ENABLED != "true")');
      return;
    }

    this.dispatchTimer = setInterval(() => {
      void this.runScheduledDispatch();
    }, this.dispatcherIntervalMs);
    this.dispatchTimer.unref?.();
    this.logger.log(`Retention dispatcher started (interval ${this.dispatcherIntervalMs}ms)`);
  }

  onModuleDestroy() {
    if (!this.dispatchTimer) return;
    clearInterval(this.dispatchTimer);
    this.dispatchTimer = undefined;
    this.logger.log('Retention dispatcher stopped');
  }

  async dispatchPendingOutbox(params?: { limit?: number; dryRun?: boolean; actorEmail?: string }) {
    const now = new Date();
    const limit = Math.min(Math.max(params?.limit ?? 20, 1), 100);
    const dryRun = Boolean(params?.dryRun);

    const dueRaw = await this.prisma.retentionMessageOutbox.findMany({
      where: {
        status: RetentionMessageStatus.PENDING,
        OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }],
      },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
      take: 250,
    });
    const due = dueRaw.filter((row) => row.attempts < row.maxAttempts).slice(0, limit);

    if (dryRun) {
      return {
        dryRun: true,
        scanned: due.length,
        dispatched: 0,
        queuedForRetry: 0,
        failedFinal: 0,
        items: due.map((row) => ({
          id: row.id,
          toEmail: row.toEmail,
          triggerKey: row.triggerKey,
          attempts: row.attempts,
          maxAttempts: row.maxAttempts,
          scheduledFor: row.scheduledFor,
        })),
      };
    }

    let dispatched = 0;
    let queuedForRetry = 0;
    let failedFinal = 0;

    for (const row of due) {
      const result = await this.deliverOutboxItem(row.id);
      if (result.status === RetentionMessageStatus.SENT) dispatched += 1;
      if (result.status === RetentionMessageStatus.PENDING) queuedForRetry += 1;
      if (result.status === RetentionMessageStatus.FAILED) failedFinal += 1;
    }

    const summary = {
      dryRun: false,
      scanned: due.length,
      dispatched,
      queuedForRetry,
      failedFinal,
    };
    if (!dryRun) {
      await this.recordAudit({
        area: 'retention',
        action: 'outbox.dispatch',
        actorEmail: params?.actorEmail ?? 'system@local',
        metadata: summary,
      });
    }
    return summary;
  }

  getDispatcherHealth() {
    return {
      enabled: this.dispatcherEnabled,
      running: Boolean(this.dispatchTimer),
      inFlight: this.dispatchInFlight,
      config: {
        intervalMs: this.dispatcherIntervalMs,
        batchSize: this.dispatcherBatchSize,
        dryRun: this.dispatcherDryRun,
      },
      lastRun: this.lastDispatchRun,
      lastError: this.lastDispatchError,
    };
  }

  listAuditLogs(params?: {
    limit?: number;
    action?: string;
    actorEmail?: string;
    from?: Date;
    to?: Date;
  }) {
    const limit = params?.limit ?? 50;
    const take = Math.min(Math.max(limit, 1), 200);
    const createdAtFilter =
      params?.from || params?.to ?
        {
          ...(params?.from ? { gte: params.from } : {}),
          ...(params?.to ? { lte: params.to } : {}),
        }
      : undefined;
    return this.prisma.adminAuditLog.findMany({
      where: {
        area: 'retention',
        ...(params?.action ? { action: params.action } : {}),
        ...(params?.actorEmail ? { actorEmail: params.actorEmail.trim().toLowerCase() } : {}),
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async listOutbox(params?: {
    status?: RetentionMessageStatus;
    triggerKey?: RetentionTriggerKey;
    limit?: number;
  }) {
    const take = Math.min(Math.max(params?.limit ?? 100, 1), 250);
    return this.prisma.retentionMessageOutbox.findMany({
      where: {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.triggerKey ? { triggerKey: params.triggerKey } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  async queueOutbox(input: {
    triggerKey: RetentionTriggerKey;
    toEmail: string;
    channel?: RetentionMessageChannel;
    templateKey?: string;
    subject?: string;
    payload?: Record<string, unknown>;
    scheduledFor?: Date;
    maxAttempts?: number;
    actorEmail?: string;
  }) {
    const email = this.normalizeEmail(input.toEmail);
    if (!email) throw new BadRequestException('Valid recipient email is required');
    const channel = input.channel ?? RetentionMessageChannel.EMAIL;

    const selectedTemplate: RetentionTemplate | null = input.templateKey ?
      await this.prisma.retentionTemplate.findUnique({ where: { id: input.templateKey } })
    : await this.prisma.retentionTemplate.findFirst({
        where: {
          triggerKey: input.triggerKey,
          channel,
          isActive: true,
        },
        orderBy: { version: 'desc' },
      });
    if (input.templateKey) {
      if (!selectedTemplate) throw new BadRequestException('Retention template not found');
      if (selectedTemplate.triggerKey !== input.triggerKey || selectedTemplate.channel !== channel) {
        throw new BadRequestException('Template does not match trigger/channel');
      }
    }

    const finalSubject = input.subject ?? selectedTemplate?.subject ?? null;
    const mergedPayload: Record<string, unknown> = {
      ...(input.payload ?? {}),
      ...(selectedTemplate ?
        {
          templateId: selectedTemplate.id,
          templateVersion: selectedTemplate.version,
          templateBody: selectedTemplate.body,
        }
      : {}),
    };

    const consent = await this.prisma.supporterConsent.findUnique({ where: { email } });
    const isBlocked = consent?.emailOptIn === false && channel === RetentionMessageChannel.EMAIL;
    const created = await this.prisma.retentionMessageOutbox.create({
      data: {
        triggerKey: input.triggerKey,
        toEmail: email,
        channel,
        templateKey: selectedTemplate?.id ?? null,
        subject: finalSubject,
        payload: mergedPayload as object,
        scheduledFor: input.scheduledFor ?? null,
        maxAttempts: input.maxAttempts ?? 3,
        status: isBlocked ? RetentionMessageStatus.BLOCKED : RetentionMessageStatus.PENDING,
        lastError: isBlocked ? 'Blocked by supporter consent preferences' : null,
      },
    });
    await this.recordAudit({
      area: 'retention',
      action: 'outbox.queue',
      actorEmail: input.actorEmail,
      entityType: 'RetentionMessageOutbox',
      entityId: created.id,
      metadata: {
        triggerKey: created.triggerKey,
        channel: created.channel,
        toEmail: created.toEmail,
        templateKey: created.templateKey,
        status: created.status,
      },
    });
    return created;
  }

  listTemplates(params?: { triggerKey?: RetentionTriggerKey; channel?: RetentionMessageChannel }) {
    return this.prisma.retentionTemplate.findMany({
      where: {
        ...(params?.triggerKey ? { triggerKey: params.triggerKey } : {}),
        ...(params?.channel ? { channel: params.channel } : {}),
      },
      orderBy: [{ triggerKey: 'asc' }, { channel: 'asc' }, { version: 'desc' }],
    });
  }

  async createTemplateVersion(input: {
    triggerKey: RetentionTriggerKey;
    channel?: RetentionMessageChannel;
    subject?: string;
    body: string;
    createdBy?: string;
  }): Promise<RetentionTemplate> {
    const channel = input.channel ?? RetentionMessageChannel.EMAIL;
    const existing = await this.prisma.retentionTemplate.findMany({
      where: { triggerKey: input.triggerKey, channel },
      orderBy: { version: 'desc' },
      take: 1,
    });
    const nextVersion = (existing[0]?.version ?? 0) + 1;
    const created = await this.prisma.retentionTemplate.create({
      data: {
        triggerKey: input.triggerKey,
        channel,
        version: nextVersion,
        subject: input.subject ?? null,
        body: input.body,
        createdBy: input.createdBy ?? null,
        isActive: existing.length === 0,
      },
    });
    await this.recordAudit({
      area: 'retention',
      action: 'template.create-version',
      actorEmail: input.createdBy,
      entityType: 'RetentionTemplate',
      entityId: created.id,
      metadata: {
        triggerKey: created.triggerKey,
        channel: created.channel,
        version: created.version,
        isActive: created.isActive,
      },
    });
    return created;
  }

  async activateTemplate(id: string, actorEmail?: string) {
    const target = await this.prisma.retentionTemplate.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Retention template not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.retentionTemplate.updateMany({
        where: {
          triggerKey: target.triggerKey,
          channel: target.channel,
          isActive: true,
          id: { not: target.id },
        },
        data: { isActive: false },
      });
      return tx.retentionTemplate.update({
        where: { id: target.id },
        data: { isActive: true },
      });
    });
    await this.recordAudit({
      area: 'retention',
      action: 'template.activate',
      actorEmail,
      entityType: 'RetentionTemplate',
      entityId: updated.id,
      metadata: {
        triggerKey: updated.triggerKey,
        channel: updated.channel,
        version: updated.version,
      },
    });
    return updated;
  }

  async retryOutbox(id: string, scheduledFor?: Date, actorEmail?: string) {
    const row = await this.prisma.retentionMessageOutbox.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Outbox item not found');
    if (row.status === RetentionMessageStatus.SENT) {
      throw new BadRequestException('Sent messages cannot be retried');
    }
    if (row.attempts >= row.maxAttempts) {
      throw new BadRequestException('Max retry attempts reached');
    }

    const updated = await this.prisma.retentionMessageOutbox.update({
      where: { id },
      data: {
        status: RetentionMessageStatus.PENDING,
        scheduledFor: scheduledFor ?? new Date(),
        lastError: null,
      },
    });
    await this.recordAudit({
      area: 'retention',
      action: 'outbox.retry',
      actorEmail,
      entityType: 'RetentionMessageOutbox',
      entityId: updated.id,
      metadata: {
        attempts: updated.attempts,
        maxAttempts: updated.maxAttempts,
        scheduledFor: updated.scheduledFor?.toISOString() ?? null,
      },
    });
    return updated;
  }

  async logOutboxAttempt(input: {
    outboxId: string;
    success: boolean;
    provider?: string;
    providerRef?: string;
    message?: string;
    metadata?: Record<string, unknown>;
    actorEmail?: string;
  }) {
    const row = await this.prisma.retentionMessageOutbox.findUnique({ where: { id: input.outboxId } });
    if (!row) throw new NotFoundException('Outbox item not found');

    const nextStatus = input.success ? RetentionMessageStatus.SENT : RetentionMessageStatus.FAILED;
    const nextAttempts = row.attempts + 1;
    const update = await this.prisma.retentionMessageOutbox.update({
      where: { id: row.id },
      data: {
        attempts: nextAttempts,
        status: nextStatus,
        sentAt: input.success ? new Date() : row.sentAt,
        lastError: input.success ? null : (input.message ?? 'Delivery failed'),
      },
    });

    await this.prisma.retentionMessageDeliveryLog.create({
      data: {
        outboxId: row.id,
        status: nextStatus,
        provider: input.provider ?? null,
        providerRef: input.providerRef ?? null,
        message: input.message ?? null,
        metadata: (input.metadata ?? {}) as object,
      },
    });

    await this.recordAudit({
      area: 'retention',
      action: 'outbox.log-attempt',
      actorEmail: input.actorEmail,
      entityType: 'RetentionMessageOutbox',
      entityId: row.id,
      metadata: {
        success: input.success,
        provider: input.provider ?? null,
        providerRef: input.providerRef ?? null,
        status: nextStatus,
        attempts: nextAttempts,
      },
    });
    return update;
  }

  private async deliverOutboxItem(id: string) {
    const row = await this.prisma.retentionMessageOutbox.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Outbox item not found');
    if (row.status !== RetentionMessageStatus.PENDING) return row;

    const shouldFail = this.shouldSimulateFailure(row.payload);
    const attemptsAfterThisTry = row.attempts + 1;
    const maxReached = attemptsAfterThisTry >= row.maxAttempts;
    const nextStatus =
      shouldFail ? (maxReached ? RetentionMessageStatus.FAILED : RetentionMessageStatus.PENDING) : RetentionMessageStatus.SENT;
    const retryAt = shouldFail && !maxReached ? this.computeRetryTime(attemptsAfterThisTry) : null;
    const message =
      shouldFail ? 'Simulated delivery failure in scaffold dispatcher' : 'Delivered via mock retention dispatcher';

    const updated = await this.prisma.retentionMessageOutbox.update({
      where: { id: row.id },
      data: {
        attempts: attemptsAfterThisTry,
        status: nextStatus,
        scheduledFor: retryAt,
        sentAt: shouldFail ? row.sentAt : new Date(),
        lastError: shouldFail ? message : null,
      },
    });

    await this.prisma.retentionMessageDeliveryLog.create({
      data: {
        outboxId: row.id,
        status: shouldFail ? RetentionMessageStatus.FAILED : RetentionMessageStatus.SENT,
        provider: 'mock-retention-dispatcher',
        providerRef: shouldFail ? null : `mock-${row.id}`,
        message,
        metadata: {
          triggerKey: row.triggerKey,
          attempts: attemptsAfterThisTry,
          maxAttempts: row.maxAttempts,
          retryAt: retryAt?.toISOString() ?? null,
        },
      },
    });

    return updated;
  }

  async getConsent(email: string) {
    const normalized = this.normalizeEmail(email);
    if (!normalized) throw new BadRequestException('Valid email is required');
    return this.prisma.supporterConsent.findUnique({ where: { email: normalized } });
  }

  async upsertConsent(input: {
    email: string;
    emailOptIn: boolean;
    smsOptIn?: boolean;
    source?: string;
    note?: string;
    updatedBy?: string;
  }) {
    const normalized = this.normalizeEmail(input.email);
    if (!normalized) throw new BadRequestException('Valid email is required');
    const saved = await this.prisma.supporterConsent.upsert({
      where: { email: normalized },
      create: {
        email: normalized,
        emailOptIn: input.emailOptIn,
        smsOptIn: input.smsOptIn ?? false,
        source: input.source ?? 'admin',
        note: input.note ?? null,
        updatedBy: input.updatedBy ?? null,
      },
      update: {
        emailOptIn: input.emailOptIn,
        smsOptIn: input.smsOptIn ?? false,
        source: input.source ?? 'admin',
        note: input.note ?? null,
        updatedBy: input.updatedBy ?? null,
      },
    });
    await this.recordAudit({
      area: 'retention',
      action: 'consent.upsert',
      actorEmail: input.updatedBy,
      entityType: 'SupporterConsent',
      entityId: saved.id,
      metadata: {
        email: saved.email,
        emailOptIn: saved.emailOptIn,
        smsOptIn: saved.smsOptIn,
      },
    });
    return saved;
  }

  getTriggerMatrix(): TriggerDefinition[] {
    return [
      {
        key: RetentionTriggerKey.WELCOME,
        label: 'Welcome journey',
        objective: 'Confirm supporter action and set expectations for next engagement steps.',
        cadence: 'Immediately after first engagement event',
        audience: 'New supporters with a donation, action submission, or event RSVP.',
        sourceSignals: ['donation.completed', 'action.submitted', 'event.rsvp.created'],
      },
      {
        key: RetentionTriggerKey.REENGAGEMENT_30,
        label: 'Re-engagement 30 days',
        objective: 'Nudge supporters who have gone quiet for 30 days.',
        cadence: 'Daily batch for 30-59 day inactivity',
        audience: 'Supporters with last engagement between 30 and 59 days ago.',
        sourceSignals: ['supporter.last_engagement_at'],
      },
      {
        key: RetentionTriggerKey.REENGAGEMENT_60,
        label: 'Re-engagement 60 days',
        objective: 'Escalate nudges for mid-term inactivity.',
        cadence: 'Daily batch for 60-89 day inactivity',
        audience: 'Supporters with last engagement between 60 and 89 days ago.',
        sourceSignals: ['supporter.last_engagement_at'],
      },
      {
        key: RetentionTriggerKey.REENGAGEMENT_90,
        label: 'Re-engagement 90 days',
        objective: 'Recover long-inactive supporters with stronger messaging.',
        cadence: 'Daily batch for 90+ day inactivity',
        audience: 'Supporters with last engagement at least 90 days ago.',
        sourceSignals: ['supporter.last_engagement_at'],
      },
      {
        key: RetentionTriggerKey.EVENT_REMINDER_24H,
        label: 'Event reminder (24h)',
        objective: 'Reduce no-shows by reminding registered attendees.',
        cadence: 'Hourly scheduler for events starting in next 24 hours',
        audience: 'Registered or waitlisted RSVPs for upcoming events.',
        sourceSignals: ['event.starts_at', 'event.rsvp.status'],
      },
      {
        key: RetentionTriggerKey.WIN_NOTIFICATION,
        label: 'Win notification',
        objective: 'Share campaign outcomes and reinforce supporter impact.',
        cadence: 'When a campaign moves to completed state',
        audience: 'Supporters linked to the completed campaign.',
        sourceSignals: ['campaign.status.completed', 'donation.campaign_id', 'action.campaign_id'],
      },
    ];
  }

  async getTriggerSnapshot(): Promise<{ generatedAt: string; triggers: TriggerSnapshot[] }> {
    const now = new Date();
    const [engagements, reminderCount, winCount] = await Promise.all([
      this.collectLatestEngagements(),
      this.computeEventReminder24hCount(now),
      this.computeWinNotificationCount(now),
    ]);

    const welcomeCount = this.countSince(engagements, now, 1);
    const reengage30 = this.countInactivityWindow(engagements, now, 30, 59);
    const reengage60 = this.countInactivityWindow(engagements, now, 60, 89);
    const reengage90 = this.countInactivityWindow(engagements, now, 90, null);

    const dueByKey: Record<RetentionTriggerKey, number> = {
      [RetentionTriggerKey.WELCOME]: welcomeCount,
      [RetentionTriggerKey.REENGAGEMENT_30]: reengage30,
      [RetentionTriggerKey.REENGAGEMENT_60]: reengage60,
      [RetentionTriggerKey.REENGAGEMENT_90]: reengage90,
      [RetentionTriggerKey.EVENT_REMINDER_24H]: reminderCount,
      [RetentionTriggerKey.WIN_NOTIFICATION]: winCount,
    };

    return {
      generatedAt: now.toISOString(),
      triggers: this.getTriggerMatrix().map((trigger) => ({
        ...trigger,
        dueCount: dueByKey[trigger.key],
      })),
    };
  }

  private async collectLatestEngagements(): Promise<Map<string, Date>> {
    const [donations, actionSubmissions, rsvps] = await Promise.all([
      this.prisma.donation.findMany({
        where: { status: DonationStatus.COMPLETED },
        select: {
          donorEmail: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
      this.prisma.actionSubmission.findMany({
        select: {
          email: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
      this.prisma.volunteerRsvp.findMany({
        select: {
          email: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
    ]);

    const rows: EngagementRow[] = [];
    for (const row of donations) {
      const email = this.normalizeEmail(row.donorEmail ?? row.user?.email ?? null);
      if (!email) continue;
      rows.push({ email, at: row.createdAt });
    }
    for (const row of actionSubmissions) {
      const email = this.normalizeEmail(row.email ?? row.user?.email ?? null);
      if (!email) continue;
      rows.push({ email, at: row.createdAt });
    }
    for (const row of rsvps) {
      const email = this.normalizeEmail(row.email ?? row.user?.email ?? null);
      if (!email) continue;
      rows.push({ email, at: row.createdAt });
    }

    const latest = new Map<string, Date>();
    for (const row of rows) {
      const prev = latest.get(row.email);
      if (!prev || row.at > prev) latest.set(row.email, row.at);
    }
    return latest;
  }

  private countSince(latestByEmail: Map<string, Date>, now: Date, days: number): number {
    const cutoff = now.getTime() - days * DAY_MS;
    let count = 0;
    for (const at of latestByEmail.values()) {
      if (at.getTime() >= cutoff) count += 1;
    }
    return count;
  }

  private countInactivityWindow(
    latestByEmail: Map<string, Date>,
    now: Date,
    minDays: number,
    maxDays: number | null,
  ): number {
    const minMs = minDays * DAY_MS;
    const maxMs = maxDays === null ? Number.POSITIVE_INFINITY : maxDays * DAY_MS;
    let count = 0;
    for (const at of latestByEmail.values()) {
      const inactiveMs = now.getTime() - at.getTime();
      if (inactiveMs >= minMs && inactiveMs <= maxMs) count += 1;
    }
    return count;
  }

  private async computeEventReminder24hCount(now: Date): Promise<number> {
    const in24h = new Date(now.getTime() + DAY_MS);
    return this.prisma.volunteerRsvp.count({
      where: {
        status: { in: [VolunteerStatus.REGISTERED, VolunteerStatus.WAITLISTED] },
        event: {
          startsAt: {
            gte: now,
            lte: in24h,
          },
        },
      },
    });
  }

  private async computeWinNotificationCount(now: Date): Promise<number> {
    const since = new Date(now.getTime() - 7 * DAY_MS);
    const completedCampaigns = await this.prisma.campaign.findMany({
      where: {
        status: CampaignStatus.COMPLETED,
        updatedAt: { gte: since },
      },
      select: { id: true },
    });
    if (!completedCampaigns.length) return 0;

    const campaignIds = completedCampaigns.map((c) => c.id);
    const [donations, actionSubmissions] = await Promise.all([
      this.prisma.donation.findMany({
        where: {
          campaignId: { in: campaignIds },
          status: DonationStatus.COMPLETED,
        },
        select: { donorEmail: true, user: { select: { email: true } } },
      }),
      this.prisma.actionSubmission.findMany({
        where: {
          action: {
            campaignId: { in: campaignIds },
          },
        },
        select: { email: true, user: { select: { email: true } } },
      }),
    ]);

    const supporters = new Set<string>();
    for (const row of donations) {
      const email = this.normalizeEmail(row.donorEmail ?? row.user?.email ?? null);
      if (email) supporters.add(email);
    }
    for (const row of actionSubmissions) {
      const email = this.normalizeEmail(row.email ?? row.user?.email ?? null);
      if (email) supporters.add(email);
    }
    return supporters.size;
  }

  private normalizeEmail(value: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim().toLowerCase();
    return trimmed || null;
  }

  private shouldSimulateFailure(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
    const maybe = payload as Record<string, unknown>;
    return maybe.forceFail === true;
  }

  private computeRetryTime(attemptsAfterThisTry: number): Date {
    const delayMinutes = RETRY_BASE_MINUTES * 2 ** Math.max(attemptsAfterThisTry - 1, 0);
    return new Date(Date.now() + delayMinutes * 60 * 1000);
  }

  private async runScheduledDispatch() {
    if (this.dispatchInFlight) return;
    this.dispatchInFlight = true;
    try {
      const result = await this.dispatchPendingOutbox({
        limit: this.dispatcherBatchSize,
        dryRun: this.dispatcherDryRun,
        actorEmail: 'system@local',
      });
      this.lastDispatchRun = {
        at: new Date().toISOString(),
        scanned: result.scanned,
        dispatched: result.dispatched,
        queuedForRetry: result.queuedForRetry,
        failedFinal: result.failedFinal,
        dryRun: result.dryRun,
      };
      this.lastDispatchError = null;
      if (result.scanned > 0) {
        this.logger.log(
          `Retention dispatch run: scanned=${result.scanned} dispatched=${result.dispatched} retry=${result.queuedForRetry} failed=${result.failedFinal} dryRun=${result.dryRun}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown dispatch error';
      this.lastDispatchError = { at: new Date().toISOString(), message };
      this.logger.error(`Retention dispatch run failed: ${message}`);
    } finally {
      this.dispatchInFlight = false;
    }
  }

  private parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
  }

  private async recordAudit(input: {
    area: string;
    action: string;
    actorEmail?: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.prisma.adminAuditLog.create({
      data: {
        area: input.area,
        action: input.action,
        actorEmail: input.actorEmail ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: (input.metadata ?? {}) as object,
      },
    });
  }
}
