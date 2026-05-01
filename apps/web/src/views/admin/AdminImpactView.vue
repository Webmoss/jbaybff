<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/services/api'
import { featureFlags } from '@/config/featureFlags'
import { useLocaleText } from '@/composables/useLocaleText'

type ImpactAdmin = {
  days: number
  donations: number
  actions: number
  actionSubmissions: number
  eventRsvps: number
  kpi: { eventName: string; count: number }[]
}

type RecurringStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED'

type RecurringAdminRow = {
  id: string
  donorEmail: string
  donorName: string | null
  amount: string
  currency: string
  interval: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'
  status: RecurringStatus
  nextChargeAt: string | null
  failedChargeAttempts: number
  lastChargeError: string | null
  campaign: { title: string } | null
}

type RunRecurringResult = {
  dryRun: boolean
  inspected: number
  charged?: number
  failed?: number
  paused?: number
  duePlanIds?: string[]
}

type RunnerHealth = {
  enabled: boolean
  running: boolean
  inFlight: boolean
  config: { intervalMs: number; batchSize: number; dryRun: boolean }
  lastRun: { at: string; inspected: number; charged: number; failed: number; paused: number; dryRun: boolean } | null
  lastError: { at: string; message: string } | null
}

type RecurringReconciliation = {
  windowDays: number
  since: string
  totals: {
    plans: number
    active: number
    paused: number
    cancelled: number
    setupPending: number
    setupActive: number
    chargesSettled: number
    chargesFailedSignals: number
  }
  recentCharges: Array<{
    id: string
    reference: string | null
    amount: string
    currency: string
    createdAt: string
    campaignId: string | null
  }>
  atRiskPlans: Array<{
    id: string
    donorEmail: string
    donorName: string | null
    status: RecurringStatus
    interval: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'
    amount: string
    failedChargeAttempts: number
    lastChargeError: string | null
    nextChargeAt: string | null
    campaign: { id: string; title: string; slug: string } | null
  }>
}

type SponsorImpactSummary = {
  range: { from: string | null; to: string | null }
  currency: string
  totals: {
    sponsors: number
    campaigns: number
    donations: number
    totalRaised: number
    actionSubmissions: number
    eventRsvps: number
  }
  sponsors: Array<{
    sponsorId: string
    companyName: string
    campaignCount: number
    donationCount: number
    totalRaised: number
    actionSubmissionCount: number
    eventRsvpCount: number
  }>
}

const summary = ref<ImpactAdmin | null>(null)
const { t } = useLocaleText()
const recurringPlans = ref<RecurringAdminRow[]>([])
const runnerHealth = ref<RunnerHealth | null>(null)
const recurringReconciliation = ref<RecurringReconciliation | null>(null)
const recurringBusy = ref(false)
const recurringMessage = ref('')
const runLimit = ref(25)
const sponsorImpact = ref<SponsorImpactSummary | null>(null)
const sponsorFilters = ref({ from: '', to: '' })

async function refreshSummary() {
  summary.value = (await api.get<ImpactAdmin>('/impact/admin/summary?days=30')).data
}

async function loadSponsorImpact() {
  if (!featureFlags.adminSponsorImpactReporting) {
    sponsorImpact.value = null
    return
  }
  sponsorImpact.value = (
    await api.get<SponsorImpactSummary>('/sponsors/admin/impact/summary', {
      params: {
        from: sponsorFilters.value.from || undefined,
        to: sponsorFilters.value.to || undefined,
      },
    })
  ).data
}

async function loadRecurring() {
  if (!featureFlags.recurringDonations) {
    recurringPlans.value = []
    runnerHealth.value = null
    return
  }
  const [plans, health] = await Promise.all([
    api.get<RecurringAdminRow[]>('/donations/admin/recurring'),
    api.get<RunnerHealth>('/donations/admin/recurring/runner-health'),
  ])
  recurringPlans.value = plans.data
  runnerHealth.value = health.data
  recurringReconciliation.value = (
    await api.get<RecurringReconciliation>('/donations/admin/recurring/reconciliation')
  ).data
}

async function runRecurring(dryRun: boolean) {
  if (!featureFlags.adminRecurringRunner) return
  recurringBusy.value = true
  recurringMessage.value = ''
  try {
    const res = await api.post<RunRecurringResult>('/donations/admin/recurring/run', {
      dryRun,
      limit: Number(runLimit.value),
    })
    if (dryRun) {
      recurringMessage.value = `Dry run checked ${res.data.inspected} plans; due IDs: ${(res.data.duePlanIds ?? []).join(', ') || 'none'}.`
    } else {
      recurringMessage.value = `Run complete. Inspected ${res.data.inspected}, charged ${res.data.charged ?? 0}, failed ${res.data.failed ?? 0}, paused ${res.data.paused ?? 0}.`
    }
    await loadRecurring()
  } catch {
    recurringMessage.value = 'Could not run recurring cycle. Please check API logs and Paystack config.'
  } finally {
    recurringBusy.value = false
  }
}

async function updateRecurringStatus(planId: string, status: RecurringStatus) {
  await api.patch(`/donations/admin/recurring/${encodeURIComponent(planId)}/status`, { status })
  await loadRecurring()
}

async function recoverRecurringPlan(planId: string, forceChargeNow = false) {
  recurringBusy.value = true
  recurringMessage.value = ''
  try {
    await api.post(`/donations/admin/recurring/${encodeURIComponent(planId)}/recover`, {
      activate: true,
      clearFailures: true,
      forceChargeNow,
    })
    recurringMessage.value = forceChargeNow
      ? 'Plan recovered and scheduled for immediate charge window.'
      : 'Plan recovered and reactivated.'
    await loadRecurring()
  } catch {
    recurringMessage.value = 'Could not recover recurring plan.'
  } finally {
    recurringBusy.value = false
  }
}

async function exportSponsorImpactCsv() {
  if (!featureFlags.adminSponsorImpactReporting) return
  const res = await api.get('/sponsors/admin/impact.csv', {
    params: {
      from: sponsorFilters.value.from || undefined,
      to: sponsorFilters.value.to || undefined,
    },
    responseType: 'blob',
  })
  const fromPart = sponsorFilters.value.from || 'all'
  const toPart = sponsorFilters.value.to || 'all'
  const fileName = `sponsor-impact-${fromPart}-to-${toPart}.csv`
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  await Promise.all([refreshSummary(), loadRecurring(), loadSponsorImpact()])
})
</script>

<template>
  <div class="space-y-10">
    <header>
      <h1 class="font-display text-3xl">{{ t('adminImpactTitle') }}</h1>
      <p class="mt-3 text-sm text-bff-blue-grey">{{ t('adminImpactSubtitle') }}</p>
    </header>

    <div v-if="summary" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article class="rounded-2xl border border-black/10 bg-white px-5 py-4">
        <p class="text-xs uppercase tracking-[0.14em] text-bff-blue-grey">Donations</p>
        <p class="mt-2 text-2xl font-semibold">{{ summary.donations }}</p>
      </article>
      <article class="rounded-2xl border border-black/10 bg-white px-5 py-4">
        <p class="text-xs uppercase tracking-[0.14em] text-bff-blue-grey">Actions</p>
        <p class="mt-2 text-2xl font-semibold">{{ summary.actions }}</p>
      </article>
      <article class="rounded-2xl border border-black/10 bg-white px-5 py-4">
        <p class="text-xs uppercase tracking-[0.14em] text-bff-blue-grey">Action submissions</p>
        <p class="mt-2 text-2xl font-semibold">{{ summary.actionSubmissions }}</p>
      </article>
      <article class="rounded-2xl border border-black/10 bg-white px-5 py-4">
        <p class="text-xs uppercase tracking-[0.14em] text-bff-blue-grey">Event RSVPs</p>
        <p class="mt-2 text-2xl font-semibold">{{ summary.eventRsvps }}</p>
      </article>
    </div>

    <section v-if="summary" class="rounded-2xl border border-black/10 bg-white p-6">
      <h2 class="font-semibold">{{ t('adminTopKpiTitle') }}</h2>
      <ul class="mt-4 grid gap-2 text-sm">
        <li v-for="item in summary.kpi" :key="item.eventName" class="flex items-center justify-between border-b border-black/5 pb-2">
          <span>{{ item.eventName }}</span>
          <strong>{{ item.count }}</strong>
        </li>
      </ul>
    </section>

    <section v-if="featureFlags.recurringDonations" class="rounded-2xl border border-black/10 bg-white p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold">{{ t('adminRecurringOpsTitle') }}</h2>
          <p class="mt-1 text-xs text-bff-blue-grey">{{ t('adminRecurringOpsSubtitle') }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <input v-model.number="runLimit" type="number" min="1" max="200" class="w-24 rounded-lg border border-black/15 px-2 py-1 text-sm" />
          <button class="rounded-lg border border-black/15 px-3 py-2 text-xs font-semibold" :disabled="recurringBusy" @click="runRecurring(true)">
            {{ t('adminDryRun') }}
          </button>
          <button class="rounded-lg bg-bff-deep px-3 py-2 text-xs font-semibold text-white" :disabled="recurringBusy" @click="runRecurring(false)">
            {{ t('adminRunCycle') }}
          </button>
        </div>
      </div>

      <p v-if="recurringMessage" class="mt-3 rounded-lg border border-black/10 bg-stone-50 px-3 py-2 text-xs text-bff-blue-grey">
        {{ recurringMessage }}
      </p>

      <div class="mt-5 space-y-3">
        <article v-if="runnerHealth" class="rounded-xl border border-black/10 bg-stone-50 p-4 text-xs text-bff-blue-grey">
          <p>
            Runner:
            <strong class="text-bff-deep">{{ runnerHealth.enabled ? 'enabled' : 'disabled' }}</strong>
            · timer:
            <strong class="text-bff-deep">{{ runnerHealth.running ? 'running' : 'stopped' }}</strong>
            · dry-run:
            <strong class="text-bff-deep">{{ runnerHealth.config.dryRun ? 'true' : 'false' }}</strong>
          </p>
          <p class="mt-1">
            Interval: {{ runnerHealth.config.intervalMs }}ms · Batch: {{ runnerHealth.config.batchSize }}
          </p>
          <p v-if="runnerHealth.lastRun" class="mt-1">
            Last run: {{ new Date(runnerHealth.lastRun.at).toLocaleString() }} · inspected {{ runnerHealth.lastRun.inspected }} · charged {{ runnerHealth.lastRun.charged }} · failed {{ runnerHealth.lastRun.failed }}
          </p>
          <p v-if="runnerHealth.lastError" class="mt-1 text-red-700">
            Last error: {{ runnerHealth.lastError.message }}
          </p>
        </article>

        <article v-if="recurringReconciliation" class="rounded-xl border border-black/10 bg-stone-50 p-4 text-xs text-bff-blue-grey">
          <p>
            {{ t('adminReconciliationLabel') }} ({{ recurringReconciliation.windowDays }}d):
            plans {{ recurringReconciliation.totals.plans }} · active {{ recurringReconciliation.totals.active }} · paused {{ recurringReconciliation.totals.paused }} · setup pending {{ recurringReconciliation.totals.setupPending }} · settled charges {{ recurringReconciliation.totals.chargesSettled }}
          </p>
          <p class="mt-1">
            {{ t('adminFailureSignals') }}: {{ recurringReconciliation.totals.chargesFailedSignals }} · {{ t('adminAtRiskPlans') }}: {{ recurringReconciliation.atRiskPlans.length }}
          </p>
        </article>

        <article v-for="plan in recurringPlans" :key="plan.id" class="rounded-xl border border-black/10 p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="font-semibold">{{ plan.donorName || plan.donorEmail }}</p>
              <p class="text-xs text-bff-blue-grey">{{ plan.currency }} {{ plan.amount }} · {{ plan.interval }} · {{ plan.status }}</p>
              <p class="mt-1 text-xs text-bff-blue-grey">
                {{ plan.campaign?.title || 'General fund' }}
                <span v-if="plan.nextChargeAt"> · next: {{ new Date(plan.nextChargeAt).toLocaleDateString() }}</span>
              </p>
              <p v-if="plan.lastChargeError" class="mt-1 text-xs text-red-700">
                Last error: {{ plan.lastChargeError }} (fails: {{ plan.failedChargeAttempts }})
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="rounded-lg border px-2.5 py-1 text-xs font-semibold" @click="updateRecurringStatus(plan.id, 'ACTIVE')">Resume</button>
              <button class="rounded-lg border px-2.5 py-1 text-xs font-semibold" @click="updateRecurringStatus(plan.id, 'PAUSED')">Pause</button>
              <button class="rounded-lg border px-2.5 py-1 text-xs font-semibold text-red-700" @click="updateRecurringStatus(plan.id, 'CANCELLED')">Cancel</button>
              <button
                v-if="plan.failedChargeAttempts > 0 || plan.status === 'PAUSED'"
                class="rounded-lg border border-amber-500 px-2.5 py-1 text-xs font-semibold text-amber-700"
                :disabled="recurringBusy"
                @click="recoverRecurringPlan(plan.id, false)"
              >
                {{ t('adminRecover') }}
              </button>
              <button
                v-if="plan.failedChargeAttempts > 0 || plan.status === 'PAUSED'"
                class="rounded-lg border border-amber-600 px-2.5 py-1 text-xs font-semibold text-amber-800"
                :disabled="recurringBusy"
                @click="recoverRecurringPlan(plan.id, true)"
              >
                {{ t('adminRecoverChargeNow') }}
              </button>
            </div>
          </div>
        </article>
        <p v-if="recurringPlans.length === 0" class="rounded-lg border border-black/10 px-3 py-3 text-sm text-bff-blue-grey">
          {{ t('adminNoRecurringPlans') }}
        </p>
      </div>
    </section>

    <section v-if="featureFlags.adminSponsorImpactReporting" class="rounded-2xl border border-black/10 bg-white p-6">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="font-semibold">Sponsor impact reporting</h2>
          <p class="mt-1 text-xs text-bff-blue-grey">Attribution snapshot across sponsored campaigns, donations, actions, and event participation.</p>
        </div>
        <div class="flex flex-wrap items-end gap-2">
          <label class="text-xs text-bff-blue-grey">
            From
            <input v-model="sponsorFilters.from" type="date" class="mt-1 rounded-lg border border-black/15 px-2 py-1 text-sm" />
          </label>
          <label class="text-xs text-bff-blue-grey">
            To
            <input v-model="sponsorFilters.to" type="date" class="mt-1 rounded-lg border border-black/15 px-2 py-1 text-sm" />
          </label>
          <button class="rounded-lg border border-black/15 px-3 py-2 text-xs font-semibold" @click="loadSponsorImpact">
            Refresh
          </button>
          <button class="rounded-lg bg-bff-deep px-3 py-2 text-xs font-semibold text-white" @click="exportSponsorImpactCsv">
            Export CSV
          </button>
        </div>
      </div>

      <div v-if="sponsorImpact" class="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <article class="rounded-xl border border-black/10 px-3 py-3 text-sm">
          <p class="text-xs text-bff-blue-grey">Sponsors</p>
          <p class="mt-1 font-semibold">{{ sponsorImpact.totals.sponsors }}</p>
        </article>
        <article class="rounded-xl border border-black/10 px-3 py-3 text-sm">
          <p class="text-xs text-bff-blue-grey">Campaigns</p>
          <p class="mt-1 font-semibold">{{ sponsorImpact.totals.campaigns }}</p>
        </article>
        <article class="rounded-xl border border-black/10 px-3 py-3 text-sm">
          <p class="text-xs text-bff-blue-grey">Donations</p>
          <p class="mt-1 font-semibold">{{ sponsorImpact.totals.donations }}</p>
        </article>
        <article class="rounded-xl border border-black/10 px-3 py-3 text-sm">
          <p class="text-xs text-bff-blue-grey">Raised</p>
          <p class="mt-1 font-semibold">{{ sponsorImpact.currency }} {{ sponsorImpact.totals.totalRaised }}</p>
        </article>
        <article class="rounded-xl border border-black/10 px-3 py-3 text-sm">
          <p class="text-xs text-bff-blue-grey">Action submissions</p>
          <p class="mt-1 font-semibold">{{ sponsorImpact.totals.actionSubmissions }}</p>
        </article>
        <article class="rounded-xl border border-black/10 px-3 py-3 text-sm">
          <p class="text-xs text-bff-blue-grey">Event RSVPs</p>
          <p class="mt-1 font-semibold">{{ sponsorImpact.totals.eventRsvps }}</p>
        </article>
      </div>

      <div v-if="sponsorImpact" class="mt-4 space-y-2">
        <article v-for="row in sponsorImpact.sponsors" :key="row.sponsorId" class="rounded-xl border border-black/10 p-3 text-sm">
          <p class="font-semibold">{{ row.companyName }}</p>
          <p class="mt-1 text-xs text-bff-blue-grey">
            Campaigns {{ row.campaignCount }} · Donations {{ row.donationCount }} · Raised {{ sponsorImpact.currency }} {{ row.totalRaised }} · Actions {{ row.actionSubmissionCount }} · RSVPs {{ row.eventRsvpCount }}
          </p>
        </article>
      </div>
    </section>
  </div>
</template>
