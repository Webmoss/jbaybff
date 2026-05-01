<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/services/api'

type TriggerSnapshotItem = {
  key: string
  label: string
  objective: string
  cadence: string
  audience: string
  sourceSignals: string[]
  dueCount: number
}

type TriggerSnapshotResponse = {
  generatedAt: string
  triggers: TriggerSnapshotItem[]
}

type OutboxRow = {
  id: string
  triggerKey: string
  status: 'PENDING' | 'SENT' | 'FAILED' | 'BLOCKED'
  toEmail: string
  attempts: number
  maxAttempts: number
  scheduledFor?: string | null
  sentAt?: string | null
  lastError?: string | null
  createdAt: string
  logs?: Array<{
    id: string
    status: 'PENDING' | 'SENT' | 'FAILED' | 'BLOCKED'
    provider?: string | null
    providerRef?: string | null
    message?: string | null
    createdAt: string
  }>
}

type ConsentRow = {
  email: string
  emailOptIn: boolean
  smsOptIn: boolean
  source?: string | null
  note?: string | null
  updatedBy?: string | null
  updatedAt: string
}

type DispatcherHealth = {
  enabled: boolean
  running: boolean
  inFlight: boolean
  config: {
    intervalMs: number
    batchSize: number
    dryRun: boolean
  }
  lastRun: {
    at: string
    scanned: number
    dispatched: number
    queuedForRetry: number
    failedFinal: number
    dryRun: boolean
  } | null
  lastError: { at: string; message: string } | null
}

type TemplateRow = {
  id: string
  triggerKey: string
  channel: 'EMAIL' | 'SMS'
  version: number
  subject?: string | null
  body: string
  isActive: boolean
  createdBy?: string | null
  createdAt: string
}

type AuditLogRow = {
  id: string
  action: string
  actorEmail?: string | null
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
}

type GovernanceReportSummary = {
  range: { from: string | null; to: string | null }
  donations: { count: number; totalAmount: string | number; currency: string }
  engagement: { actionSubmissions: number; eventRsvps: number; kpiEvents: number }
}

const loading = ref(false)
const actionBusy = ref(false)
const notice = ref('')
const triggerSnapshot = ref<TriggerSnapshotResponse | null>(null)
const outbox = ref<OutboxRow[]>([])
const health = ref<DispatcherHealth | null>(null)
const outboxStatus = ref<'all' | OutboxRow['status']>('all')
const templates = ref<TemplateRow[]>([])
const auditLogs = ref<AuditLogRow[]>([])
const auditFilters = ref({
  action: '',
  actorEmail: '',
  from: '',
  to: '',
})
const queueForm = ref({
  triggerKey: 'WELCOME',
  toEmail: '',
  templateKey: 'auto',
  subject: '',
  forceFail: false,
})
const templateForm = ref({
  triggerKey: 'WELCOME',
  channel: 'EMAIL' as 'EMAIL' | 'SMS',
  subject: '',
  body: '',
})
const consentLookupEmail = ref('')
const consentForm = ref({
  email: '',
  emailOptIn: true,
  smsOptIn: false,
  note: '',
})
const consentRecord = ref<ConsentRow | null>(null)
const reportFilters = ref({
  from: '',
  to: '',
})
const reportSummary = ref<GovernanceReportSummary | null>(null)

const filteredOutbox = computed(() =>
  outbox.value.filter((row) => outboxStatus.value === 'all' || row.status === outboxStatus.value),
)
const queueTemplateOptions = computed(() =>
  templates.value
    .filter((t) => t.channel === 'EMAIL' && t.triggerKey === queueForm.value.triggerKey)
    .sort((a, b) => b.version - a.version),
)
const activeQueueTemplate = computed(() =>
  queueTemplateOptions.value.find((t) => t.isActive) ?? null,
)
const selectedQueueTemplate = computed(() => {
  if (queueForm.value.templateKey === 'auto') return activeQueueTemplate.value
  return queueTemplateOptions.value.find((t) => t.id === queueForm.value.templateKey) ?? null
})
const queuePreviewSubject = computed(() => queueForm.value.subject || selectedQueueTemplate.value?.subject || '')
const queuePreviewBody = computed(() => selectedQueueTemplate.value?.body || '')
const queueBlockedByMissingTemplate = computed(
  () => queueForm.value.templateKey === 'auto' && !activeQueueTemplate.value,
)

watch(
  () => queueForm.value.triggerKey,
  () => {
    queueForm.value.templateKey = 'auto'
  },
)

function statusChipClass(status: OutboxRow['status']) {
  if (status === 'SENT') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (status === 'FAILED') return 'bg-rose-100 text-rose-800 border-rose-200'
  if (status === 'BLOCKED') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-sky-100 text-sky-800 border-sky-200'
}

async function loadAll() {
  loading.value = true
  notice.value = ''
  try {
    const [snapshotRes, outboxRes, healthRes, templatesRes, auditRes, reportRes] = await Promise.all([
      api.get<TriggerSnapshotResponse>('/retention/admin/trigger-snapshot'),
      api.get<OutboxRow[]>('/retention/admin/outbox'),
      api.get<DispatcherHealth>('/retention/admin/dispatcher-health'),
      api.get<TemplateRow[]>('/retention/admin/templates'),
      api.get<AuditLogRow[]>('/retention/admin/audit-logs', {
        params: {
          limit: 25,
          ...(auditFilters.value.action ? { action: auditFilters.value.action } : {}),
          ...(auditFilters.value.actorEmail ? { actorEmail: auditFilters.value.actorEmail } : {}),
          ...(auditFilters.value.from ? { from: new Date(`${auditFilters.value.from}T00:00:00.000Z`).toISOString() } : {}),
          ...(auditFilters.value.to ? { to: new Date(`${auditFilters.value.to}T23:59:59.999Z`).toISOString() } : {}),
        },
      }),
      api.get<GovernanceReportSummary>('/impact/admin/reports/summary', {
        params: {
          ...(reportFilters.value.from ? { from: new Date(`${reportFilters.value.from}T00:00:00.000Z`).toISOString() } : {}),
          ...(reportFilters.value.to ? { to: new Date(`${reportFilters.value.to}T23:59:59.999Z`).toISOString() } : {}),
        },
      }),
    ])
    triggerSnapshot.value = snapshotRes.data
    outbox.value = outboxRes.data
    health.value = healthRes.data
    templates.value = templatesRes.data
    auditLogs.value = auditRes.data
    reportSummary.value = reportRes.data
  } catch {
    notice.value = 'Could not load retention data. Please try again.'
  } finally {
    loading.value = false
  }
}

async function exportGovernanceCsv(kind: 'donations' | 'engagement') {
  actionBusy.value = true
  notice.value = ''
  try {
    const endpoint =
      kind === 'donations' ? '/impact/admin/reports/donations.csv' : '/impact/admin/reports/engagement.csv'
    const fileName = kind === 'donations' ? 'donations-report.csv' : 'engagement-report.csv'
    const res = await api.get(endpoint, {
      params: {
        ...(reportFilters.value.from ? { from: new Date(`${reportFilters.value.from}T00:00:00.000Z`).toISOString() } : {}),
        ...(reportFilters.value.to ? { to: new Date(`${reportFilters.value.to}T23:59:59.999Z`).toISOString() } : {}),
      },
      responseType: 'blob',
    })
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    notice.value = `Downloaded ${fileName}.`
  } catch {
    notice.value = `Could not export ${kind} report.`
  } finally {
    actionBusy.value = false
  }
}

async function dispatchOutbox(dryRun: boolean) {
  actionBusy.value = true
  notice.value = ''
  try {
    const { data } = await api.post<{
      scanned: number
      dispatched: number
      queuedForRetry: number
      failedFinal: number
      dryRun: boolean
    }>('/retention/admin/outbox/dispatch', {
      dryRun,
      limit: 20,
    })
    notice.value = dryRun
      ? `Dry run scanned ${data.scanned} messages.`
      : `Dispatch complete: sent ${data.dispatched}, retry ${data.queuedForRetry}, failed ${data.failedFinal}.`
    await loadAll()
  } catch {
    notice.value = 'Dispatch action failed.'
  } finally {
    actionBusy.value = false
  }
}

async function queueMessage() {
  if (queueBlockedByMissingTemplate.value) {
    notice.value = 'Create and activate a template before queueing in auto mode.'
    return
  }
  if (!queueForm.value.toEmail) {
    notice.value = 'Recipient email is required to queue a message.'
    return
  }
  actionBusy.value = true
  notice.value = ''
  try {
    await api.post('/retention/admin/outbox/queue', {
      triggerKey: queueForm.value.triggerKey,
      toEmail: queueForm.value.toEmail,
      channel: 'EMAIL',
      templateKey: queueForm.value.templateKey === 'auto' ? undefined : queueForm.value.templateKey,
      subject: queueForm.value.subject || undefined,
      payload: {
        forceFail: queueForm.value.forceFail,
      },
    })
    notice.value = `Queued ${queueForm.value.triggerKey} message for ${queueForm.value.toEmail}.`
    queueForm.value.toEmail = ''
    queueForm.value.templateKey = 'auto'
    queueForm.value.subject = ''
    queueForm.value.forceFail = false
    await loadAll()
  } catch {
    notice.value = 'Queue action failed. Check trigger/email and try again.'
  } finally {
    actionBusy.value = false
  }
}

async function retryOutboxRow(id: string) {
  actionBusy.value = true
  notice.value = ''
  try {
    await api.patch(`/retention/admin/outbox/${encodeURIComponent(id)}/retry`, {})
    notice.value = 'Retry queued for selected outbox item.'
    await loadAll()
  } catch {
    notice.value = 'Retry failed for selected outbox item.'
  } finally {
    actionBusy.value = false
  }
}

async function lookupConsent() {
  if (!consentLookupEmail.value) {
    notice.value = 'Enter an email to load consent.'
    return
  }
  actionBusy.value = true
  notice.value = ''
  consentRecord.value = null
  try {
    const { data } = await api.get<ConsentRow | null>('/retention/admin/consent', {
      params: { email: consentLookupEmail.value },
    })
    if (!data) {
      consentForm.value = {
        email: consentLookupEmail.value.trim().toLowerCase(),
        emailOptIn: true,
        smsOptIn: false,
        note: '',
      }
      notice.value = 'No consent record found. You can create one below.'
      return
    }
    consentRecord.value = data
    consentForm.value = {
      email: data.email,
      emailOptIn: data.emailOptIn,
      smsOptIn: data.smsOptIn,
      note: data.note ?? '',
    }
    notice.value = `Loaded consent for ${data.email}.`
  } catch {
    notice.value = 'Consent lookup failed.'
  } finally {
    actionBusy.value = false
  }
}

async function saveConsent() {
  if (!consentForm.value.email) {
    notice.value = 'Consent email is required.'
    return
  }
  actionBusy.value = true
  notice.value = ''
  try {
    const { data } = await api.put<ConsentRow>('/retention/admin/consent', {
      email: consentForm.value.email,
      emailOptIn: consentForm.value.emailOptIn,
      smsOptIn: consentForm.value.smsOptIn,
      note: consentForm.value.note || undefined,
      source: 'admin-retention',
    })
    consentRecord.value = data
    notice.value = `Saved consent for ${data.email}.`
    await loadAll()
  } catch {
    notice.value = 'Saving consent failed.'
  } finally {
    actionBusy.value = false
  }
}

async function createTemplate() {
  if (!templateForm.value.body.trim()) {
    notice.value = 'Template body is required.'
    return
  }
  actionBusy.value = true
  notice.value = ''
  try {
    await api.post('/retention/admin/templates', {
      triggerKey: templateForm.value.triggerKey,
      channel: templateForm.value.channel,
      subject: templateForm.value.subject || undefined,
      body: templateForm.value.body,
    })
    templateForm.value.subject = ''
    templateForm.value.body = ''
    notice.value = `Created new ${templateForm.value.triggerKey} template version.`
    await loadAll()
  } catch {
    notice.value = 'Creating template failed.'
  } finally {
    actionBusy.value = false
  }
}

async function activateTemplate(id: string) {
  actionBusy.value = true
  notice.value = ''
  try {
    await api.patch(`/retention/admin/templates/${encodeURIComponent(id)}/activate`, {})
    notice.value = 'Template version activated.'
    await loadAll()
  } catch {
    notice.value = 'Activating template failed.'
  } finally {
    actionBusy.value = false
  }
}

function clearAuditFilters() {
  auditFilters.value = {
    action: '',
    actorEmail: '',
    from: '',
    to: '',
  }
  void loadAll()
}

onMounted(() => void loadAll())
</script>

<template>
  <div class="space-y-8">
    <header class="space-y-3">
      <h1 class="font-display text-3xl">Retention automation</h1>
      <p class="text-sm text-bff-blue-grey">
        Monitor trigger due counts, outbox delivery state, and dispatcher health.
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg border bg-white px-4 py-2 text-xs font-semibold"
          :disabled="loading || actionBusy"
          @click="loadAll"
        >
          Refresh
        </button>
        <button
          type="button"
          class="rounded-lg border bg-white px-4 py-2 text-xs font-semibold"
          :disabled="loading || actionBusy"
          @click="dispatchOutbox(true)"
        >
          Dispatch dry run
        </button>
        <button
          type="button"
          class="rounded-lg border bg-bff-deep px-4 py-2 text-xs font-semibold text-white"
          :disabled="loading || actionBusy"
          @click="dispatchOutbox(false)"
        >
          Dispatch now
        </button>
      </div>
      <p v-if="notice" class="text-xs text-bff-blue-grey" role="status">{{ notice }}</p>
    </header>

    <section v-if="health" class="rounded-2xl border border-black/[0.08] bg-white p-5">
      <h2 class="text-sm font-semibold text-bff-deep">Dispatcher health</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article class="rounded-xl border border-black/[0.08] bg-stone-50 p-3">
          <p class="text-xs uppercase tracking-[0.12em] text-bff-blue-grey">Enabled</p>
          <p class="mt-2 font-semibold">{{ health.enabled ? 'Yes' : 'No' }}</p>
        </article>
        <article class="rounded-xl border border-black/[0.08] bg-stone-50 p-3">
          <p class="text-xs uppercase tracking-[0.12em] text-bff-blue-grey">Running</p>
          <p class="mt-2 font-semibold">{{ health.running ? 'Yes' : 'No' }}</p>
        </article>
        <article class="rounded-xl border border-black/[0.08] bg-stone-50 p-3">
          <p class="text-xs uppercase tracking-[0.12em] text-bff-blue-grey">Batch size</p>
          <p class="mt-2 font-semibold">{{ health.config.batchSize }}</p>
        </article>
        <article class="rounded-xl border border-black/[0.08] bg-stone-50 p-3">
          <p class="text-xs uppercase tracking-[0.12em] text-bff-blue-grey">Interval</p>
          <p class="mt-2 font-semibold">{{ health.config.intervalMs }}ms</p>
        </article>
      </div>
      <p v-if="health.lastRun" class="mt-4 text-xs text-bff-blue-grey">
        Last run {{ new Date(health.lastRun.at).toLocaleString() }} · scanned {{ health.lastRun.scanned }} · dispatched
        {{ health.lastRun.dispatched }} · retry {{ health.lastRun.queuedForRetry }} · failed
        {{ health.lastRun.failedFinal }}
      </p>
      <p v-if="health.lastError" class="mt-2 text-xs text-red-700">
        Last error {{ new Date(health.lastError.at).toLocaleString() }} · {{ health.lastError.message }}
      </p>
    </section>

    <section v-if="triggerSnapshot" class="rounded-2xl border border-black/[0.08] bg-white p-5">
      <h2 class="text-sm font-semibold text-bff-deep">Trigger snapshot</h2>
      <p class="mt-1 text-xs text-bff-blue-grey">
        Generated {{ new Date(triggerSnapshot.generatedAt).toLocaleString() }}
      </p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="trigger in triggerSnapshot.triggers"
          :key="trigger.key"
          class="rounded-xl border border-black/[0.08] bg-stone-50 p-4"
        >
          <p class="text-xs uppercase tracking-[0.12em] text-bff-blue-grey">{{ trigger.key }}</p>
          <p class="mt-1 font-semibold">{{ trigger.label }}</p>
          <p class="mt-2 text-sm text-bff-blue-grey">{{ trigger.objective }}</p>
          <p class="mt-3 text-xs text-bff-blue-grey">Due now: <span class="font-semibold text-bff-deep">{{ trigger.dueCount }}</span></p>
        </article>
      </div>
    </section>

    <section class="rounded-2xl border border-black/[0.08] bg-white p-5">
      <h2 class="text-sm font-semibold text-bff-deep">Governance reports</h2>
      <p class="mt-1 text-xs text-bff-blue-grey">Donation and engagement reporting exports for admin audits.</p>
      <div class="mt-3 flex flex-wrap items-end gap-2">
        <label class="text-xs text-bff-blue-grey">
          From
          <input v-model="reportFilters.from" type="date" class="mt-1 rounded-lg border px-3 py-2 text-sm" />
        </label>
        <label class="text-xs text-bff-blue-grey">
          To
          <input v-model="reportFilters.to" type="date" class="mt-1 rounded-lg border px-3 py-2 text-sm" />
        </label>
        <button
          type="button"
          class="rounded-lg border bg-white px-3 py-2 text-xs font-semibold"
          :disabled="loading || actionBusy"
          @click="loadAll"
        >
          Refresh summary
        </button>
        <button
          type="button"
          class="rounded-lg border bg-white px-3 py-2 text-xs font-semibold"
          :disabled="loading || actionBusy"
          @click="exportGovernanceCsv('donations')"
        >
          Export donations CSV
        </button>
        <button
          type="button"
          class="rounded-lg border bg-white px-3 py-2 text-xs font-semibold"
          :disabled="loading || actionBusy"
          @click="exportGovernanceCsv('engagement')"
        >
          Export engagement CSV
        </button>
      </div>
      <div v-if="reportSummary" class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <article class="rounded-xl border border-black/[0.08] bg-stone-50 p-3">
          <p class="text-xs uppercase tracking-[0.12em] text-bff-blue-grey">Donations</p>
          <p class="mt-2 font-semibold">{{ reportSummary.donations.count }}</p>
        </article>
        <article class="rounded-xl border border-black/[0.08] bg-stone-50 p-3">
          <p class="text-xs uppercase tracking-[0.12em] text-bff-blue-grey">Total raised</p>
          <p class="mt-2 font-semibold">{{ reportSummary.donations.totalAmount }} {{ reportSummary.donations.currency }}</p>
        </article>
        <article class="rounded-xl border border-black/[0.08] bg-stone-50 p-3">
          <p class="text-xs uppercase tracking-[0.12em] text-bff-blue-grey">Action submissions</p>
          <p class="mt-2 font-semibold">{{ reportSummary.engagement.actionSubmissions }}</p>
        </article>
        <article class="rounded-xl border border-black/[0.08] bg-stone-50 p-3">
          <p class="text-xs uppercase tracking-[0.12em] text-bff-blue-grey">Event RSVPs</p>
          <p class="mt-2 font-semibold">{{ reportSummary.engagement.eventRsvps }}</p>
        </article>
        <article class="rounded-xl border border-black/[0.08] bg-stone-50 p-3">
          <p class="text-xs uppercase tracking-[0.12em] text-bff-blue-grey">KPI events</p>
          <p class="mt-2 font-semibold">{{ reportSummary.engagement.kpiEvents }}</p>
        </article>
      </div>
    </section>

    <section class="rounded-2xl border border-black/[0.08] bg-white p-5">
      <h2 class="text-sm font-semibold text-bff-deep">Queue test message</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label class="text-xs text-bff-blue-grey">
          Trigger
          <select v-model="queueForm.triggerKey" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
            <option value="WELCOME">WELCOME</option>
            <option value="REENGAGEMENT_30">REENGAGEMENT_30</option>
            <option value="REENGAGEMENT_60">REENGAGEMENT_60</option>
            <option value="REENGAGEMENT_90">REENGAGEMENT_90</option>
            <option value="EVENT_REMINDER_24H">EVENT_REMINDER_24H</option>
            <option value="WIN_NOTIFICATION">WIN_NOTIFICATION</option>
          </select>
        </label>
        <label class="text-xs text-bff-blue-grey">
          Recipient email
          <input v-model="queueForm.toEmail" type="email" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </label>
        <label class="text-xs text-bff-blue-grey">
          Template
          <select v-model="queueForm.templateKey" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
            <option value="auto">Auto active template</option>
            <option v-for="template in queueTemplateOptions" :key="template.id" :value="template.id">
              v{{ template.version }}{{ template.isActive ? ' (active)' : '' }}
            </option>
          </select>
        </label>
        <label class="text-xs text-bff-blue-grey">
          Subject (optional)
          <input v-model="queueForm.subject" type="text" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </label>
        <label class="mt-6 flex items-center gap-2 text-xs text-bff-blue-grey">
          <input v-model="queueForm.forceFail" type="checkbox" />
          Force simulated failure
        </label>
      </div>
      <button
        type="button"
        class="mt-4 rounded-lg border bg-bff-deep px-4 py-2 text-xs font-semibold text-white"
        :disabled="loading || actionBusy || queueBlockedByMissingTemplate"
        :title="queueBlockedByMissingTemplate ? 'Create an active template to queue in auto mode' : 'Queue message'"
        @click="queueMessage"
      >
        Queue message
      </button>
      <div class="mt-4 rounded-xl border border-black/[0.08] bg-stone-50 p-3 text-xs text-bff-blue-grey">
        <p class="font-semibold text-bff-deep">Effective template preview</p>
        <p
          v-if="queueForm.templateKey === 'auto' && !activeQueueTemplate"
          class="mt-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800"
          role="alert"
        >
          No active template found for this trigger/channel. Queueing will proceed without template body.
        </p>
        <p class="mt-2">
          Source:
          <span class="font-semibold text-bff-deep">
            {{
              queueForm.templateKey === 'auto'
                ? (activeQueueTemplate ? `Auto active (v${activeQueueTemplate.version})` : 'Auto active (none found)')
                : (selectedQueueTemplate ? `Selected v${selectedQueueTemplate.version}` : 'Selected template missing')
            }}
          </span>
        </p>
        <p class="mt-2">Subject: <span class="font-semibold text-bff-deep">{{ queuePreviewSubject || '—' }}</span></p>
        <p class="mt-2 whitespace-pre-wrap rounded bg-white p-2">
          {{ queuePreviewBody || 'No template body available for this trigger/channel.' }}
        </p>
      </div>
    </section>

    <section class="rounded-2xl border border-black/[0.08] bg-white p-5">
      <h2 class="text-sm font-semibold text-bff-deep">Templates (versioned)</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label class="text-xs text-bff-blue-grey">
          Trigger
          <select v-model="templateForm.triggerKey" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
            <option value="WELCOME">WELCOME</option>
            <option value="REENGAGEMENT_30">REENGAGEMENT_30</option>
            <option value="REENGAGEMENT_60">REENGAGEMENT_60</option>
            <option value="REENGAGEMENT_90">REENGAGEMENT_90</option>
            <option value="EVENT_REMINDER_24H">EVENT_REMINDER_24H</option>
            <option value="WIN_NOTIFICATION">WIN_NOTIFICATION</option>
          </select>
        </label>
        <label class="text-xs text-bff-blue-grey">
          Channel
          <select v-model="templateForm.channel" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
            <option value="EMAIL">EMAIL</option>
            <option value="SMS">SMS</option>
          </select>
        </label>
        <label class="text-xs text-bff-blue-grey lg:col-span-3">
          Subject (optional)
          <input v-model="templateForm.subject" type="text" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </label>
        <label class="text-xs text-bff-blue-grey sm:col-span-2 lg:col-span-5">
          Body
          <textarea v-model="templateForm.body" rows="4" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </label>
      </div>
      <button
        type="button"
        class="mt-4 rounded-lg border bg-bff-deep px-4 py-2 text-xs font-semibold text-white"
        :disabled="loading || actionBusy"
        @click="createTemplate"
      >
        Create new version
      </button>

      <div class="mt-4 overflow-auto rounded-xl border border-black/[0.08]">
        <table class="min-w-[960px] w-full text-left text-sm">
          <thead class="bg-stone-200/70 text-xs uppercase tracking-[0.12em] text-bff-deep/70">
            <tr>
              <th class="px-4 py-3">Trigger</th>
              <th class="px-4 py-3">Channel</th>
              <th class="px-4 py-3">Version</th>
              <th class="px-4 py-3">Subject</th>
              <th class="px-4 py-3">State</th>
              <th class="px-4 py-3">Created</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in templates" :key="row.id" class="border-t border-black/[0.08]">
              <td class="px-4 py-3">{{ row.triggerKey }}</td>
              <td class="px-4 py-3">{{ row.channel }}</td>
              <td class="px-4 py-3">v{{ row.version }}</td>
              <td class="px-4 py-3 text-xs text-bff-blue-grey">{{ row.subject || '—' }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold" :class="row.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-700 border-stone-200'">
                  {{ row.isActive ? 'Active' : 'Draft' }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-bff-blue-grey">{{ new Date(row.createdAt).toLocaleString() }}</td>
              <td class="px-4 py-3">
                <button
                  v-if="!row.isActive"
                  type="button"
                  class="rounded border px-2 py-1 text-xs font-semibold"
                  :disabled="loading || actionBusy"
                  @click="activateTemplate(row.id)"
                >
                  Activate
                </button>
                <span v-else class="text-xs text-bff-blue-grey">—</span>
              </td>
            </tr>
            <tr v-if="templates.length === 0">
              <td class="px-4 py-6 text-sm text-bff-blue-grey" colspan="7">No templates yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="rounded-2xl border border-black/[0.08] bg-white p-5">
      <h2 class="text-sm font-semibold text-bff-deep">Consent manager</h2>
      <div class="mt-3 flex flex-wrap items-end gap-2">
        <label class="text-xs text-bff-blue-grey">
          Lookup email
          <input v-model="consentLookupEmail" type="email" class="mt-1 rounded-lg border px-3 py-2 text-sm" />
        </label>
        <button
          type="button"
          class="rounded-lg border bg-white px-4 py-2 text-xs font-semibold"
          :disabled="loading || actionBusy"
          @click="lookupConsent"
        >
          Load consent
        </button>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label class="text-xs text-bff-blue-grey">
          Email
          <input v-model="consentForm.email" type="email" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </label>
        <label class="mt-6 flex items-center gap-2 text-xs text-bff-blue-grey">
          <input v-model="consentForm.emailOptIn" type="checkbox" />
          Email opt-in
        </label>
        <label class="mt-6 flex items-center gap-2 text-xs text-bff-blue-grey">
          <input v-model="consentForm.smsOptIn" type="checkbox" />
          SMS opt-in
        </label>
        <label class="text-xs text-bff-blue-grey">
          Note
          <input v-model="consentForm.note" type="text" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </label>
      </div>
      <button
        type="button"
        class="mt-4 rounded-lg border bg-bff-deep px-4 py-2 text-xs font-semibold text-white"
        :disabled="loading || actionBusy"
        @click="saveConsent"
      >
        Save consent
      </button>
      <p v-if="consentRecord" class="mt-3 text-xs text-bff-blue-grey">
        Current record updated {{ new Date(consentRecord.updatedAt).toLocaleString() }} by
        {{ consentRecord.updatedBy || 'system' }}.
      </p>
    </section>

    <section class="rounded-2xl border border-black/[0.08] bg-white p-5">
      <h2 class="text-sm font-semibold text-bff-deep">Audit trail</h2>
      <p class="mt-1 text-xs text-bff-blue-grey">Recent retention admin actions with actor and timestamp.</p>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label class="text-xs text-bff-blue-grey">
          Action
          <input v-model="auditFilters.action" type="text" placeholder="outbox.queue" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </label>
        <label class="text-xs text-bff-blue-grey sm:col-span-2">
          Actor email
          <input v-model="auditFilters.actorEmail" type="email" placeholder="admin@..." class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </label>
        <label class="text-xs text-bff-blue-grey">
          From
          <input v-model="auditFilters.from" type="date" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </label>
        <label class="text-xs text-bff-blue-grey">
          To
          <input v-model="auditFilters.to" type="date" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </label>
        <div class="flex items-end gap-2">
          <button
            type="button"
            class="rounded-lg border bg-white px-3 py-2 text-xs font-semibold"
            :disabled="loading || actionBusy"
            @click="loadAll"
          >
            Apply
          </button>
          <button
            type="button"
            class="rounded-lg border bg-white px-3 py-2 text-xs"
            :disabled="loading || actionBusy"
            @click="clearAuditFilters"
          >
            Clear
          </button>
        </div>
      </div>
      <div class="mt-4 overflow-auto rounded-xl border border-black/[0.08]">
        <table class="min-w-[880px] w-full text-left text-sm">
          <thead class="bg-stone-200/70 text-xs uppercase tracking-[0.12em] text-bff-deep/70">
            <tr>
              <th class="px-4 py-3">When</th>
              <th class="px-4 py-3">Action</th>
              <th class="px-4 py-3">Actor</th>
              <th class="px-4 py-3">Entity</th>
              <th class="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in auditLogs" :key="row.id" class="border-t border-black/[0.08]">
              <td class="px-4 py-3 text-xs text-bff-blue-grey">{{ new Date(row.createdAt).toLocaleString() }}</td>
              <td class="px-4 py-3 font-semibold text-bff-deep">{{ row.action }}</td>
              <td class="px-4 py-3 text-xs text-bff-blue-grey">{{ row.actorEmail || 'system' }}</td>
              <td class="px-4 py-3 text-xs text-bff-blue-grey">
                {{ row.entityType || '—' }}<span v-if="row.entityId"> · {{ row.entityId }}</span>
              </td>
              <td class="px-4 py-3">
                <details v-if="row.metadata" class="text-xs text-bff-blue-grey">
                  <summary class="cursor-pointer font-semibold text-bff-deep">View</summary>
                  <pre class="mt-1 max-w-[340px] whitespace-pre-wrap break-words rounded bg-stone-50 p-2">{{ JSON.stringify(row.metadata, null, 2) }}</pre>
                </details>
                <span v-else class="text-xs text-bff-blue-grey">—</span>
              </td>
            </tr>
            <tr v-if="auditLogs.length === 0">
              <td class="px-4 py-6 text-sm text-bff-blue-grey" colspan="5">No audit records yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="rounded-2xl border border-black/[0.08] bg-white p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-sm font-semibold text-bff-deep">Outbox queue</h2>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="rounded-full border px-3 py-1 text-xs" :class="outboxStatus === 'all' ? 'bg-bff-deep text-white border-bff-deep' : ''" @click="outboxStatus = 'all'">All</button>
          <button type="button" class="rounded-full border px-3 py-1 text-xs" :class="outboxStatus === 'PENDING' ? 'bg-bff-deep text-white border-bff-deep' : ''" @click="outboxStatus = 'PENDING'">Pending</button>
          <button type="button" class="rounded-full border px-3 py-1 text-xs" :class="outboxStatus === 'SENT' ? 'bg-bff-deep text-white border-bff-deep' : ''" @click="outboxStatus = 'SENT'">Sent</button>
          <button type="button" class="rounded-full border px-3 py-1 text-xs" :class="outboxStatus === 'FAILED' ? 'bg-bff-deep text-white border-bff-deep' : ''" @click="outboxStatus = 'FAILED'">Failed</button>
          <button type="button" class="rounded-full border px-3 py-1 text-xs" :class="outboxStatus === 'BLOCKED' ? 'bg-bff-deep text-white border-bff-deep' : ''" @click="outboxStatus = 'BLOCKED'">Blocked</button>
        </div>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-bff-blue-grey">
        <span>Status legend:</span>
        <span class="inline-flex rounded-full border px-2 py-0.5 font-semibold" :class="statusChipClass('PENDING')">Pending</span>
        <span class="inline-flex rounded-full border px-2 py-0.5 font-semibold" :class="statusChipClass('SENT')">Sent</span>
        <span class="inline-flex rounded-full border px-2 py-0.5 font-semibold" :class="statusChipClass('FAILED')">Failed</span>
        <span class="inline-flex rounded-full border px-2 py-0.5 font-semibold" :class="statusChipClass('BLOCKED')">Blocked</span>
      </div>
      <div class="mt-4 overflow-auto rounded-xl border border-black/[0.08]">
        <table class="min-w-[920px] w-full text-left text-sm">
          <thead class="bg-stone-200/70 text-xs uppercase tracking-[0.12em] text-bff-deep/70">
            <tr>
              <th class="px-4 py-3">Recipient</th>
              <th class="px-4 py-3">Trigger</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Attempts</th>
              <th class="px-4 py-3">Scheduled</th>
              <th class="px-4 py-3">Last error</th>
              <th class="px-4 py-3">Actions</th>
              <th class="px-4 py-3">Delivery logs</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredOutbox" :key="row.id" class="border-t border-black/[0.08]">
              <td class="px-4 py-3">{{ row.toEmail }}</td>
              <td class="px-4 py-3">{{ row.triggerKey }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold" :class="statusChipClass(row.status)">
                  {{ row.status }}
                </span>
              </td>
              <td class="px-4 py-3">{{ row.attempts }} / {{ row.maxAttempts }}</td>
              <td class="px-4 py-3">{{ row.scheduledFor ? new Date(row.scheduledFor).toLocaleString() : 'Now' }}</td>
              <td class="px-4 py-3 text-xs text-bff-blue-grey">{{ row.lastError || '—' }}</td>
              <td class="px-4 py-3">
                <button
                  v-if="row.status === 'FAILED' || row.status === 'BLOCKED'"
                  type="button"
                  class="rounded border px-2 py-1 text-xs font-semibold"
                  :disabled="loading || actionBusy || row.attempts >= row.maxAttempts"
                  @click="retryOutboxRow(row.id)"
                >
                  Retry
                </button>
                <span v-else class="text-xs text-bff-blue-grey">—</span>
              </td>
              <td class="px-4 py-3">
                <details v-if="row.logs?.length" class="rounded border border-black/[0.08] bg-stone-50 p-2">
                  <summary class="cursor-pointer text-xs font-semibold text-bff-deep">
                    {{ row.logs.length }} recent log{{ row.logs.length > 1 ? 's' : '' }}
                  </summary>
                  <ul class="mt-2 space-y-2 text-xs text-bff-blue-grey">
                    <li v-for="log in row.logs" :key="log.id" class="rounded bg-white px-2 py-1">
                      <p>
                        <span class="inline-flex rounded-full border px-2 py-0.5 font-semibold" :class="statusChipClass(log.status)">
                          {{ log.status }}
                        </span>
                        · {{ new Date(log.createdAt).toLocaleString() }}
                      </p>
                      <p v-if="log.provider">Provider: {{ log.provider }}<span v-if="log.providerRef"> ({{ log.providerRef }})</span></p>
                      <p v-if="log.message">{{ log.message }}</p>
                    </li>
                  </ul>
                </details>
                <span v-else class="text-xs text-bff-blue-grey">No logs</span>
              </td>
            </tr>
            <tr v-if="filteredOutbox.length === 0">
              <td class="px-4 py-6 text-sm text-bff-blue-grey" colspan="8">No outbox rows for this filter.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
