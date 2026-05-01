import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { RetentionMessageChannel, RetentionMessageStatus, RetentionTriggerKey, UserRole } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DispatchRetentionOutboxDto } from './dto/dispatch-retention-outbox.dto';
import { CreateRetentionTemplateDto } from './dto/create-retention-template.dto';
import { LogRetentionAttemptDto } from './dto/log-retention-attempt.dto';
import { QueueRetentionMessageDto } from './dto/queue-retention-message.dto';
import { UpsertSupporterConsentDto } from './dto/upsert-supporter-consent.dto';
import { RetentionService } from './retention.service';

type MaybeAuthedRequest = Request & { user?: { email?: string } };

@Controller('retention')
export class RetentionController {
  constructor(private readonly retention: RetentionService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/trigger-matrix')
  getTriggerMatrix() {
    return this.retention.getTriggerMatrix();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/trigger-snapshot')
  getTriggerSnapshot() {
    return this.retention.getTriggerSnapshot();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/dispatcher-health')
  getDispatcherHealth() {
    return this.retention.getDispatcherHealth();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/templates')
  listTemplates(
    @Query('triggerKey') triggerKey?: RetentionTriggerKey,
    @Query('channel') channel?: RetentionMessageChannel,
  ) {
    return this.retention.listTemplates({ triggerKey, channel });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/templates')
  createTemplate(@Body() dto: CreateRetentionTemplateDto, @Req() req: MaybeAuthedRequest) {
    return this.retention.createTemplateVersion({
      triggerKey: dto.triggerKey,
      channel: dto.channel,
      subject: dto.subject,
      body: dto.body,
      createdBy: req.user?.email,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/templates/:id/activate')
  activateTemplate(@Param('id') id: string, @Req() req: MaybeAuthedRequest) {
    return this.retention.activateTemplate(id, req.user?.email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/outbox')
  listOutbox(
    @Query('status') status?: RetentionMessageStatus,
    @Query('triggerKey') triggerKey?: RetentionTriggerKey,
    @Query('limit') limit?: string,
  ) {
    return this.retention.listOutbox({
      status,
      triggerKey,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/outbox/queue')
  queueOutbox(@Body() dto: QueueRetentionMessageDto, @Req() req: MaybeAuthedRequest) {
    return this.retention.queueOutbox({
      triggerKey: dto.triggerKey,
      toEmail: dto.toEmail,
      channel: dto.channel,
      templateKey: dto.templateKey,
      subject: dto.subject,
      payload: dto.payload,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      maxAttempts: dto.maxAttempts,
      actorEmail: req.user?.email,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/outbox/dispatch')
  dispatchOutbox(@Body() dto: DispatchRetentionOutboxDto, @Req() req: MaybeAuthedRequest) {
    return this.retention.dispatchPendingOutbox({
      limit: dto.limit,
      dryRun: dto.dryRun,
      actorEmail: req.user?.email,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/outbox/:id/retry')
  retryOutbox(@Param('id') id: string, @Body() body: { scheduledFor?: string }, @Req() req: MaybeAuthedRequest) {
    return this.retention.retryOutbox(id, body?.scheduledFor ? new Date(body.scheduledFor) : undefined, req.user?.email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/outbox/:id/log-attempt')
  logOutboxAttempt(@Param('id') id: string, @Body() dto: LogRetentionAttemptDto, @Req() req: MaybeAuthedRequest) {
    return this.retention.logOutboxAttempt({
      outboxId: id,
      success: dto.success,
      provider: dto.provider,
      providerRef: dto.providerRef,
      message: dto.message,
      metadata: dto.metadata,
      actorEmail: req.user?.email,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/consent')
  getConsent(@Query('email') email: string) {
    return this.retention.getConsent(email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('admin/consent')
  upsertConsent(@Body() dto: UpsertSupporterConsentDto, @Req() req: MaybeAuthedRequest) {
    return this.retention.upsertConsent({
      email: dto.email,
      emailOptIn: dto.emailOptIn,
      smsOptIn: dto.smsOptIn,
      source: dto.source,
      note: dto.note,
      updatedBy: req.user?.email,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/audit-logs')
  listAuditLogs(
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('actorEmail') actorEmail?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.retention.listAuditLogs({
      limit: limit ? Number(limit) : undefined,
      action,
      actorEmail,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }
}
