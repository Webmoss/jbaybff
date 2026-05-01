<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useHead } from '@unhead/vue'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import { api } from '@/services/api'
import { useShopCartStore } from '@/stores/shopCart'
import { trackEvent } from '@/services/kpi'

useHead({ title: 'Shop checkout · Jeffreys Bay Blue Flag' })

const route = useRoute()
const cart = useShopCartStore()
const loading = ref(true)
const message = ref('')
const detail = ref<{ status: string; order?: { reference: string; paymentStatus: string; totalAmount: string } } | null>(null)

onMounted(() => {
  const refParam = typeof route.query.ref === 'string' ? route.query.ref : ''
  if (!refParam) {
    loading.value = false
    message.value = 'Missing payment reference. If you completed checkout, keep your Paystack receipt and contact support.'
    return
  }

  void (async () => {
    try {
      const res = await api.get<{ status: string; order?: { reference: string; paymentStatus: string; totalAmount: string } }>(
        `/shop/verify/${encodeURIComponent(refParam)}`,
      )
      detail.value = res.data
      if (res.data.status === 'completed') {
        cart.clear()
        trackEvent('shop_checkout_verified_completed', { reference: refParam })
        message.value = 'Payment confirmed. Thank you for supporting Jeffreys Bay Blue Flag.'
      } else {
        message.value = 'Payment is still pending confirmation. Please refresh in a minute if your bank has been charged.'
      }
    } catch {
      message.value = 'We could not verify that reference yet. Keep your Paystack receipt and contact us if needed.'
    } finally {
      loading.value = false
    }
  })()
})
</script>

<template>
  <SectionPanel tone="sand">
    <h1 class="font-display text-3xl">Shop checkout status</h1>
    <p v-if="loading" class="mt-6 text-bff-blue-grey">Verifying payment...</p>
    <p v-else class="mt-6 max-w-xl text-[17px] leading-relaxed text-bff-deep/85">{{ message }}</p>
    <div v-if="detail?.order" class="mt-8 rounded-2xl border border-black/[0.08] bg-white px-8 py-6 text-sm text-bff-blue-grey shadow-sm">
      <p><span class="font-semibold text-bff-deep">Order:</span> {{ detail.order.reference }}</p>
      <p class="mt-2"><span class="font-semibold text-bff-deep">Payment:</span> {{ detail.order.paymentStatus }}</p>
      <p class="mt-2"><span class="font-semibold text-bff-deep">Total:</span> ZAR {{ detail.order.totalAmount }}</p>
    </div>
    <RouterLink class="mt-10 inline-flex font-semibold text-bff-deep hover:text-bff-coral" :to="{ name: 'shop' }">
      ← Back to shop
    </RouterLink>
  </SectionPanel>
</template>
