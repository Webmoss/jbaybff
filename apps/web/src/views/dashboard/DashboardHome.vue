<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { RouterLink } from 'vue-router'
import { api } from '@/services/api'
import { trackEvent } from '@/services/kpi'

const auth = useAuthStore()

type DonRow = {
  amount: string
  createdAt: string
  currency: string
  campaign?: { title: string; slug?: string | null }
}

const rows = ref<DonRow[]>([])
const amount = ref('100')
const campaignId = ref<string | ''>('')
const donorEmail = ref('')
const donorName = ref('')
const donating = ref(false)
const toast = ref('')

onMounted(() => void loadMine())

async function loadMine() {
  const me = await api.get<DonRow[]>('/donations/mine')
  rows.value = me.data
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
</script>

<template>
  <div class="max-w-[880px]">
    <header>
      <h1 class="font-display text-3xl">Hi {{ auth.user?.name }},</h1>
      <p class="mt-4 text-[15px] leading-relaxed text-bff-deep/73">
        Start a secure Paystack checkout below. Your ledger updates after webhook verification.
      </p>
    </header>

    <section class="mt-10 rounded-[34px] border border-black/[0.07] bg-white p-6 shadow-wave sm:mt-16 sm:p-10 lg:p-14">
      <h2 class="font-display text-2xl">Donate securely</h2>
      <p class="mt-4 text-[14px] text-bff-deep/68">Amount in ZAR. Optional campaign UUID for directed support.</p>

      <label class="mt-8 block font-semibold text-[13px] uppercase tracking-[0.16em]">
        Email
        <input v-model="donorEmail" type="email" class="mt-4 w-full max-w-xl rounded-xl border px-4 py-[0.7rem]" />
      </label>

      <label class="mt-7 block font-semibold text-[13px] uppercase tracking-[0.16em]">
        Name (optional)
        <input v-model="donorName" type="text" class="mt-4 w-full max-w-xl rounded-xl border px-4 py-[0.7rem]" />
      </label>

      <label class="mt-7 block font-semibold text-[13px] uppercase tracking-[0.16em]">
        Amount
        <input v-model="amount" type="number" min="10" step="1" class="mt-4 w-full max-w-[220px] rounded-xl border px-4 py-[0.7rem]" />
      </label>

      <label class="mt-7 block font-semibold text-[13px] uppercase tracking-[0.16em]">
        Campaign ID (paste from Admin → Campaigns)
        <input v-model="campaignId" type="text" class="font-mono mt-4 w-full max-w-xl rounded-xl border px-4 py-[0.7rem] text-[14px]" />
      </label>

      <button
        type="button"
        class="mt-10 w-full rounded-xl bg-bff-deep px-6 py-[0.9rem] font-semibold text-[15px] text-white hover:bg-[#074e70] sm:w-auto sm:px-14"
        :disabled="donating"
        @click="startCheckout"
      >
        {{ donating ? 'Redirecting…' : 'Continue to Paystack' }}
      </button>
      <p v-if="toast" class="mt-6 text-[14px] text-bff-blue-grey" role="status">{{ toast }}</p>
    </section>

    <section class="mt-16" aria-labelledby="ledger">
      <h2 id="ledger" class="font-display text-2xl">Your ledger</h2>
      <ul class="mt-10 grid gap-4">
        <li
          v-for="(item, idx) in rows"
          :key="idx"
          class="flex flex-wrap items-center justify-between gap-5 rounded-[26px] border border-black/[0.07] px-10 py-5"
        >
          <div>
            <p class="text-xl font-semibold">{{ item.currency }} {{ item.amount }}</p>
            <p class="mt-2 text-[14px] text-bff-deep/70">{{ item.campaign?.title ?? 'General fund' }}</p>
          </div>
          <time class="text-[13px] text-bff-blue-grey">{{ new Date(item.createdAt).toLocaleString() }}</time>
        </li>
        <li v-if="rows.length === 0" class="rounded-[26px] border border-black/[0.07] px-6 py-8 text-[15px] text-bff-blue-grey sm:px-10 sm:py-10">
          No donations tracked yet — your support starts here.
          <RouterLink class="mt-10 inline-flex underline underline-offset-8 hover:text-bff-deep" :to="{ name: 'campaigns' }">
            Fuel a shoreline win →
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
