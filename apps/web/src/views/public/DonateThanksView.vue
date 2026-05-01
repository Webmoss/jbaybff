<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useHead } from '@unhead/vue'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import { api } from '@/services/api'
import { trackEvent } from '@/services/kpi'

useHead({ title: 'Thank you · Jeffreys Bay Blue Flag' })

const route = useRoute()
const loading = ref(true)
const message = ref('')
const detail = ref<{ status: string; donation?: { amount: string; currency: string; status: string } } | null>(null)

onMounted(() => {
  const refParam = typeof route.query.ref === 'string' ? route.query.ref : ''
  if (!refParam) {
    loading.value = false
    message.value = 'Missing payment reference. If you completed a donation, check your email for a receipt from Paystack.'
    return
  }

  void (async () => {
    try {
      const res = await api.get<{ status: string; donation?: { amount: string; currency: string; status: string } }>(
        `/donations/verify/${encodeURIComponent(refParam)}`,
      )
      detail.value = res.data
      if (res.data.status === 'completed') {
        trackEvent('donation_verified_completed', { reference: refParam })
        message.value = 'Your gift is recorded — thank you for stewarding Jeffreys Bay.'
      } else {
        trackEvent('donation_verified_pending', { reference: refParam, status: res.data.status })
        message.value =
          'We could not confirm payment yet. If money left your account, wait a minute for webhooks or contact us with your Paystack reference.'
      }
    } catch {
      message.value = 'We could not look up that reference. Keep your Paystack receipt and email hello@jbaybff.org.za.'
    } finally {
      loading.value = false
    }
  })()
})
</script>

<template>
  <SectionPanel tone="sand">
    <h1 class="font-display text-3xl">Thank you</h1>
    <p v-if="loading" class="mt-6 text-bff-blue-grey">Confirming with our server…</p>
    <p v-else class="mt-6 max-w-xl text-[17px] leading-relaxed text-bff-deep/85">{{ message }}</p>
    <div v-if="detail?.donation" class="mt-10 rounded-2xl border border-black/[0.08] bg-white px-8 py-6 text-sm text-bff-blue-grey shadow-sm">
      <p>
        <span class="font-semibold text-bff-deep">Ledger status:</span>
        {{ detail.donation.status }}
      </p>
      <p class="mt-2">
        <span class="font-semibold text-bff-deep">Amount:</span>
        {{ detail.donation.currency }} {{ detail.donation.amount }}
      </p>
    </div>
    <RouterLink class="mt-12 inline-flex font-semibold text-bff-deep hover:text-bff-coral" :to="{ name: 'home' }">
      ← Back home
    </RouterLink>
  </SectionPanel>
</template>
