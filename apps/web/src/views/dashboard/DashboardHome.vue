<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { RouterLink } from 'vue-router'
import { useRoute } from 'vue-router'
import { api } from '@/services/api'
import { trackEvent } from '@/services/kpi'
import { featureFlags } from '@/config/featureFlags'
import { useLocaleText } from '@/composables/useLocaleText'

const auth = useAuthStore()
const route = useRoute()
const { t } = useLocaleText()

type DonRow = {
  amount: string
  createdAt: string
  currency: string
  campaign?: { title: string; slug?: string | null }
}

type RecurringPlanRow = {
  id: string
  amount: string
  currency: string
  interval: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED'
  nextChargeAt: string | null
  campaign?: { title: string; slug?: string | null } | null
}

type SponsorOwnImpact = {
  range: { from: string | null; to: string | null }
  currency: string
  sponsor: {
    sponsorId: string
    companyName: string
    campaignCount: number
    donationCount: number
    totalRaised: number
    actionSubmissionCount: number
    eventRsvpCount: number
  }
  campaigns: Array<{
    id: string
    title: string
    slug: string
    status: string
    published: boolean
  }>
}

const rows = ref<DonRow[]>([])
const recurringRows = ref<RecurringPlanRow[]>([])
const sponsorImpact = ref<SponsorOwnImpact | null>(null)
const amount = ref('100')
const campaignId = ref<string | ''>('')
const donorEmail = ref('')
const donorName = ref('')
const donating = ref(false)
const recurringBusy = ref(false)
const toast = ref('')
const recurringAmount = ref('100')
const recurringInterval = ref<'WEEKLY' | 'MONTHLY' | 'QUARTERLY'>('MONTHLY')

onMounted(async () => {
  if (featureFlags.recurringDonations) {
    await maybeVerifyRecurringSetup()
  }
  await loadMine()
})

async function loadMine() {
  const sponsorReq: Promise<{ data: SponsorOwnImpact | null }> =
    auth.isSponsor && featureFlags.sponsorImpactSelfService ?
      api.get<SponsorOwnImpact>('/sponsors/me/impact').then((res) => ({ data: res.data })).catch(() => ({ data: null }))
    : Promise.resolve({ data: null })
  const recurringReq: Promise<{ data: RecurringPlanRow[] }> =
    featureFlags.recurringDonations ?
      api.get<RecurringPlanRow[]>('/donations/recurring/mine')
    : Promise.resolve({ data: [] })
  const [oneTime, recurring, sponsor] = await Promise.all([
    api.get<DonRow[]>('/donations/mine'),
    recurringReq,
    sponsorReq,
  ])
  rows.value = oneTime.data
  recurringRows.value = recurring.data
  sponsorImpact.value = sponsor.data
}

async function startCheckout() {
  donating.value = true
  toast.value = ''
  try {
    if (!donorEmail.value.trim()) {
      toast.value = 'Please add your email for the Paystack receipt.'
      return
    }
    const res = await api.post<{ authorizationUrl: string }>('/donations/checkout', {
      email: donorEmail.value.trim(),
      name: donorName.value.trim() || undefined,
      amount: Number(amount.value),
      campaignId: campaignId.value ? campaignId.value : undefined,
    })
    trackEvent('donation_checkout_started', {
      amount: Number(amount.value),
      hasCampaignId: Boolean(campaignId.value),
    })
    window.location.href = res.data.authorizationUrl
    return
  } finally {
    donating.value = false
  }
}

async function createRecurringPlan() {
  recurringBusy.value = true
  toast.value = ''
  try {
    if (!donorEmail.value.trim()) {
      toast.value = 'Please add your email before creating a recurring plan.'
      return
    }
    const res = await api.post<{ authorizationUrl: string }>('/donations/recurring/checkout', {
      email: donorEmail.value.trim(),
      name: donorName.value.trim() || undefined,
      amount: Number(recurringAmount.value),
      campaignId: campaignId.value ? campaignId.value : undefined,
      interval: recurringInterval.value,
    })
    trackEvent('recurring_checkout_started', {
      amount: Number(recurringAmount.value),
      interval: recurringInterval.value,
      hasCampaignId: Boolean(campaignId.value),
    })
    window.location.href = res.data.authorizationUrl
    return
  } finally {
    recurringBusy.value = false
  }
}

async function maybeVerifyRecurringSetup() {
  const ref = typeof route.query.ref === 'string' ? route.query.ref : ''
  const setup = route.query.recurringSetup
  if (!ref || setup !== '1') return
  try {
    const { data } = await api.get<{ status: string }>(`/donations/recurring/verify/${encodeURIComponent(ref)}`)
    if (data.status === 'active') {
      toast.value = 'Recurring plan is active.'
    } else {
      toast.value = 'Recurring setup is pending confirmation.'
    }
  } catch {
    toast.value = 'Could not verify recurring setup yet.'
  } finally {
    window.history.replaceState({}, '', '/dashboard')
  }
}

async function updateRecurringStatus(planId: string, status: 'ACTIVE' | 'PAUSED' | 'CANCELLED') {
  await api.patch(`/donations/recurring/mine/${encodeURIComponent(planId)}/status`, { status })
  await loadMine()
}
</script>

<template>
  <div class="max-w-[880px]">
    <header>
      <h1 class="font-display text-3xl">{{ t('dashboardGreetingPrefix') }} {{ auth.user?.name }},</h1>
      <p class="mt-4 text-[15px] leading-relaxed text-bff-deep/73">
        {{ t('dashboardSecureIntro') }}
      </p>
    </header>

    <section v-if="featureFlags.sponsorImpactSelfService && auth.isSponsor && sponsorImpact" class="mt-10 rounded-[34px] border border-black/[0.07] bg-white p-6 shadow-wave sm:mt-16 sm:p-10 lg:p-14">
      <h2 class="font-display text-2xl">{{ sponsorImpact.sponsor.companyName }} {{ t('dashboardSponsorImpactTitle') }}</h2>
      <p class="mt-3 text-[14px] text-bff-deep/68">{{ t('dashboardSponsorImpactSubtitle') }}</p>
      <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article class="rounded-2xl border border-black/[0.08] px-4 py-4">
          <p class="text-xs uppercase tracking-[0.14em] text-bff-blue-grey">{{ t('dashboardMetricCampaigns') }}</p>
          <p class="mt-2 text-xl font-semibold">{{ sponsorImpact.sponsor.campaignCount }}</p>
        </article>
        <article class="rounded-2xl border border-black/[0.08] px-4 py-4">
          <p class="text-xs uppercase tracking-[0.14em] text-bff-blue-grey">{{ t('dashboardMetricDonations') }}</p>
          <p class="mt-2 text-xl font-semibold">{{ sponsorImpact.sponsor.donationCount }}</p>
        </article>
        <article class="rounded-2xl border border-black/[0.08] px-4 py-4">
          <p class="text-xs uppercase tracking-[0.14em] text-bff-blue-grey">{{ t('dashboardMetricRaised') }}</p>
          <p class="mt-2 text-xl font-semibold">{{ sponsorImpact.currency }} {{ sponsorImpact.sponsor.totalRaised }}</p>
        </article>
        <article class="rounded-2xl border border-black/[0.08] px-4 py-4">
          <p class="text-xs uppercase tracking-[0.14em] text-bff-blue-grey">{{ t('dashboardMetricEngagement') }}</p>
          <p class="mt-2 text-xl font-semibold">{{ sponsorImpact.sponsor.actionSubmissionCount + sponsorImpact.sponsor.eventRsvpCount }}</p>
        </article>
      </div>
      <ul class="mt-6 grid gap-3">
        <li v-for="campaign in sponsorImpact.campaigns" :key="campaign.id" class="rounded-xl border border-black/[0.08] px-4 py-3 text-sm">
          <p class="font-semibold">{{ campaign.title }}</p>
          <p class="mt-1 text-xs text-bff-blue-grey">{{ campaign.slug }} · {{ campaign.status }} · {{ campaign.published ? 'published' : 'draft' }}</p>
        </li>
      </ul>
    </section>

    <section class="mt-10 rounded-[34px] border border-black/[0.07] bg-white p-6 shadow-wave sm:mt-16 sm:p-10 lg:p-14">
      <h2 class="font-display text-2xl">{{ t('dashboardDonateTitle') }}</h2>
      <p class="mt-4 text-[14px] text-bff-deep/68">{{ t('dashboardDonateSubtitle') }}</p>

      <label class="mt-8 block font-semibold text-[13px] uppercase tracking-[0.16em]">
        {{ t('dashboardEmailLabel') }}
        <input v-model="donorEmail" type="email" class="mt-4 w-full max-w-xl rounded-xl border px-4 py-[0.7rem]" />
      </label>

      <label class="mt-7 block font-semibold text-[13px] uppercase tracking-[0.16em]">
        {{ t('dashboardNameOptionalLabel') }}
        <input v-model="donorName" type="text" class="mt-4 w-full max-w-xl rounded-xl border px-4 py-[0.7rem]" />
      </label>

      <label class="mt-7 block font-semibold text-[13px] uppercase tracking-[0.16em]">
        {{ t('dashboardAmountLabel') }}
        <input v-model="amount" type="number" min="10" step="1" class="mt-4 w-full max-w-[220px] rounded-xl border px-4 py-[0.7rem]" />
      </label>

      <label class="mt-7 block font-semibold text-[13px] uppercase tracking-[0.16em]">
        {{ t('dashboardCampaignIdLabel') }}
        <input v-model="campaignId" type="text" class="font-mono mt-4 w-full max-w-xl rounded-xl border px-4 py-[0.7rem] text-[14px]" />
      </label>

      <button
        type="button"
        class="mt-10 w-full rounded-xl bg-bff-deep px-6 py-[0.9rem] font-semibold text-[15px] text-white hover:bg-[#074e70] sm:w-auto sm:px-14"
        :disabled="donating"
        @click="startCheckout"
      >
        {{ donating ? t('dashboardRedirecting') : t('dashboardContinuePaystack') }}
      </button>
      <p v-if="toast" class="mt-6 text-[14px] text-bff-blue-grey" role="status">{{ toast }}</p>
    </section>

    <section v-if="featureFlags.recurringDonations" class="mt-12 rounded-[34px] border border-black/[0.07] bg-white p-6 shadow-wave sm:p-10 lg:p-14">
      <h2 class="font-display text-2xl">{{ t('dashboardRecurringTitle') }}</h2>
      <p class="mt-4 text-[14px] text-bff-deep/68">{{ t('dashboardRecurringSubtitle') }}</p>

      <label class="mt-7 block font-semibold text-[13px] uppercase tracking-[0.16em]">
        {{ t('dashboardAmountLabel') }}
        <input v-model="recurringAmount" type="number" min="10" step="1" class="mt-4 w-full max-w-[220px] rounded-xl border px-4 py-[0.7rem]" />
      </label>

      <label class="mt-7 block font-semibold text-[13px] uppercase tracking-[0.16em]">
        {{ t('dashboardIntervalLabel') }}
        <select v-model="recurringInterval" class="mt-4 w-full max-w-xs rounded-xl border px-4 py-[0.7rem]">
          <option value="WEEKLY">{{ t('dashboardWeekly') }}</option>
          <option value="MONTHLY">{{ t('dashboardMonthly') }}</option>
          <option value="QUARTERLY">{{ t('dashboardQuarterly') }}</option>
        </select>
      </label>

      <button
        type="button"
        class="mt-8 w-full rounded-xl bg-bff-deep px-6 py-[0.9rem] font-semibold text-[15px] text-white hover:bg-[#074e70] sm:w-auto sm:px-10"
        :disabled="recurringBusy"
        @click="createRecurringPlan"
      >
        {{ recurringBusy ? t('dashboardRedirecting') : t('dashboardCreateRecurring') }}
      </button>

      <ul class="mt-10 grid gap-4">
        <li v-for="plan in recurringRows" :key="plan.id" class="rounded-[26px] border border-black/[0.07] px-6 py-5 sm:px-8">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="text-lg font-semibold">{{ plan.currency }} {{ plan.amount }} · {{ plan.interval }}</p>
              <p class="mt-1 text-[14px] text-bff-deep/70">
                {{ plan.campaign?.title ?? t('dashboardGeneralFund') }} · {{ t('dashboardStatusLabel') }}: {{ plan.status }}
              </p>
              <p v-if="plan.nextChargeAt" class="mt-1 text-[13px] text-bff-blue-grey">{{ t('dashboardNextChargeWindow') }}: {{ new Date(plan.nextChargeAt).toLocaleDateString() }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="rounded-lg border px-3 py-1.5 text-xs font-semibold" @click="updateRecurringStatus(plan.id, 'ACTIVE')">{{ t('dashboardResume') }}</button>
              <button class="rounded-lg border px-3 py-1.5 text-xs font-semibold" @click="updateRecurringStatus(plan.id, 'PAUSED')">{{ t('dashboardPause') }}</button>
              <button class="rounded-lg border px-3 py-1.5 text-xs font-semibold text-red-700" @click="updateRecurringStatus(plan.id, 'CANCELLED')">{{ t('dashboardCancel') }}</button>
            </div>
          </div>
        </li>
        <li v-if="recurringRows.length === 0" class="rounded-[26px] border border-black/[0.07] px-6 py-8 text-[15px] text-bff-blue-grey sm:px-10 sm:py-10">
          {{ t('dashboardNoRecurringPlans') }}
        </li>
      </ul>
    </section>

    <section class="mt-16" aria-labelledby="ledger">
      <h2 id="ledger" class="font-display text-2xl">{{ t('dashboardLedgerTitle') }}</h2>
      <ul class="mt-10 grid gap-4">
        <li
          v-for="(item, idx) in rows"
          :key="idx"
          class="flex flex-wrap items-center justify-between gap-5 rounded-[26px] border border-black/[0.07] px-10 py-5"
        >
          <div>
            <p class="text-xl font-semibold">{{ item.currency }} {{ item.amount }}</p>
            <p class="mt-2 text-[14px] text-bff-deep/70">{{ item.campaign?.title ?? t('dashboardGeneralFund') }}</p>
          </div>
          <time class="text-[13px] text-bff-blue-grey">{{ new Date(item.createdAt).toLocaleString() }}</time>
        </li>
        <li v-if="rows.length === 0" class="rounded-[26px] border border-black/[0.07] px-6 py-8 text-[15px] text-bff-blue-grey sm:px-10 sm:py-10">
          {{ t('dashboardNoDonations') }}
          <RouterLink class="mt-10 inline-flex underline underline-offset-8 hover:text-bff-deep" :to="{ name: 'campaigns' }">
            {{ t('dashboardFuelShoreline') }}
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
