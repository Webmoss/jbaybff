<script setup lang="ts">
import { ref } from 'vue'
import { useHead } from '@unhead/vue'
import { RouterLink } from 'vue-router'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import HeroBanner from '@/components/ui/HeroBanner.vue'
import { api } from '@/services/api'
import { mediaUrl } from '@/config/http'
import { trackEvent } from '@/services/kpi'
import { useShopCartStore } from '@/stores/shopCart'
import type { ShopProduct } from '@/types/api'

useHead({ title: 'Shop · Jeffreys Bay Blue Flag' })

const products = ref<ShopProduct[]>([])
const cart = useShopCartStore()
const checkoutLoading = ref(false)
const checkoutError = ref('')
const checkoutForm = ref({ email: '', name: '', phone: '' })

;(async () => {
  try {
    const res = await api.get<ShopProduct[]>('/shop/public/products')
    products.value = res.data
  } catch {
    products.value = []
  }
})()

function formatCurrency(value: number | string) {
  const amount = typeof value === 'string' ? Number(value) : value
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
}

async function checkout() {
  if (!cart.items.length) return
  checkoutLoading.value = true
  checkoutError.value = ''
  try {
    const res = await api.post<{ authorizationUrl: string; reference: string; orderId: string }>(
      '/shop/checkout',
      {
        email: checkoutForm.value.email,
        name: checkoutForm.value.name,
        phone: checkoutForm.value.phone || undefined,
        items: cart.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      },
    )
    trackEvent('shop_checkout_initialized', {
      orderId: res.data.orderId,
      reference: res.data.reference,
      lineItems: cart.totalItems,
    })
    window.location.href = res.data.authorizationUrl
  } catch {
    checkoutError.value = 'Could not start checkout. Please verify your details and try again.'
  } finally {
    checkoutLoading.value = false
  }
}
</script>

<template>
  <SectionPanel tone="white">
    <HeroBanner
      kicker="Shop"
      title="Wear your support for cleaner coasts."
      subtitle="Browse foundation merchandise and fund local stewardship through every order."
    />
  </SectionPanel>

  <SectionPanel tone="sand">
    <div class="grid gap-8 lg:grid-cols-[1.55fr_0.95fr]">
      <div>
        <div class="grid gap-6 md:grid-cols-2">
          <article v-for="product in products" :key="product.id" class="bff-card overflow-hidden">
            <div class="aspect-[16/11] bg-bff-sand">
              <img
                v-if="product.imageUrl"
                class="h-full w-full object-cover"
                :src="mediaUrl(product.imageUrl)"
                :alt="product.title"
                loading="lazy"
              />
            </div>
            <div class="px-6 py-5">
              <h2 class="font-display text-2xl">{{ product.title }}</h2>
              <p class="mt-3 text-sm text-bff-blue-grey">{{ product.description.slice(0, 120) }}...</p>
              <p class="mt-3 text-sm font-semibold text-bff-deep">
                From {{ formatCurrency(product.variants[0]?.price ?? 0) }}
              </p>
              <RouterLink class="mt-5 inline-flex font-semibold text-bff-deep hover:text-bff-coral" :to="{ name: 'shop-detail', params: { slug: product.slug } }">
                View product →
              </RouterLink>
            </div>
          </article>
        </div>
      </div>

      <aside class="bff-card h-fit px-6 py-6">
        <h2 class="font-display text-2xl">Cart</h2>
        <p class="mt-2 text-sm text-bff-blue-grey">{{ cart.totalItems }} item(s)</p>
        <div class="mt-5 space-y-3">
          <div v-for="item in cart.items" :key="item.variantId" class="rounded-xl border border-black/10 bg-white px-3 py-3 text-sm">
            <p class="font-semibold">{{ item.productTitle }}</p>
            <p class="text-bff-blue-grey">{{ item.variantTitle }} · Qty {{ item.quantity }}</p>
            <p class="mt-1">{{ formatCurrency(item.unitPrice * item.quantity) }}</p>
            <button class="mt-2 text-xs font-semibold text-bff-coral" @click="cart.removeItem(item.variantId)">Remove</button>
          </div>
        </div>

        <p class="mt-6 text-sm font-semibold">Total: {{ formatCurrency(cart.totalAmount) }}</p>

        <div class="mt-4 grid gap-3">
          <input v-model="checkoutForm.name" class="rounded-xl border border-black/15 px-3 py-2 text-sm" placeholder="Full name" />
          <input v-model="checkoutForm.email" type="email" class="rounded-xl border border-black/15 px-3 py-2 text-sm" placeholder="Email" />
          <input v-model="checkoutForm.phone" class="rounded-xl border border-black/15 px-3 py-2 text-sm" placeholder="Phone (optional)" />
        </div>
        <p v-if="checkoutError" class="mt-3 text-sm text-red-700">{{ checkoutError }}</p>
        <button
          class="bff-button-primary mt-5 w-full justify-center"
          :disabled="checkoutLoading || !cart.items.length || !checkoutForm.name || !checkoutForm.email"
          @click="checkout"
        >
          {{ checkoutLoading ? 'Starting checkout...' : 'Checkout securely' }}
        </button>
      </aside>
    </div>
  </SectionPanel>
</template>
