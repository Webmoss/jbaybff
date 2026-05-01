<script setup lang="ts">
import { computed, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute } from 'vue-router'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import { api } from '@/services/api'
import { mediaUrl } from '@/config/http'
import { trackEvent } from '@/services/kpi'
import { useShopCartStore } from '@/stores/shopCart'
import type { ShopProduct, ShopVariant } from '@/types/api'

const route = useRoute()
const cart = useShopCartStore()
const loading = ref(true)
const product = ref<ShopProduct | null>(null)
const selectedVariantId = ref('')
const quantity = ref(1)
const addedNotice = ref('')

const selectedVariant = computed<ShopVariant | null>(() => {
  if (!product.value) return null
  return product.value.variants.find((variant) => variant.id === selectedVariantId.value) ?? null
})

function formatCurrency(value: number | string) {
  const amount = typeof value === 'string' ? Number(value) : value
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
}

;(async () => {
  const slug = String(route.params.slug ?? '')
  if (!slug) {
    loading.value = false
    return
  }
  try {
    const res = await api.get<ShopProduct>(`/shop/public/products/${encodeURIComponent(slug)}`)
    product.value = res.data
    selectedVariantId.value = res.data.variants.find((variant) => variant.isDefault)?.id ?? res.data.variants[0]?.id ?? ''
    const canonical = `https://www.jbaybff.org.za/shop/${encodeURIComponent(slug)}`
    useHead({
      title: `${res.data.title} · Shop · JBay BFF`,
      link: [{ rel: 'canonical', href: canonical }],
      meta: [
        { name: 'description', content: res.data.description.slice(0, 160) },
        { property: 'og:type', content: 'product' },
        { property: 'og:title', content: `${res.data.title} · Shop · JBay BFF` },
        { property: 'og:description', content: res.data.description.slice(0, 160) },
        { property: 'og:url', content: canonical },
        { name: 'twitter:title', content: `${res.data.title} · Shop · JBay BFF` },
        { name: 'twitter:description', content: res.data.description.slice(0, 160) },
      ],
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: res.data.title,
            description: res.data.description,
            url: canonical,
          }),
        } as unknown as never,
      ],
    })
  } catch {
    product.value = null
  } finally {
    loading.value = false
  }
})()

function addToCart() {
  const row = selectedVariant.value
  if (!row || !product.value) return
  cart.addItem({
    variantId: row.id,
    productSlug: product.value.slug,
    productTitle: product.value.title,
    variantTitle: row.title,
    sku: row.sku,
    unitPrice: Number(row.price),
    quantity: quantity.value,
  })
  trackEvent('shop_add_to_cart', {
    productId: product.value.id,
    variantId: row.id,
    quantity: quantity.value,
  })
  addedNotice.value = `${product.value.title} added to cart`
}
</script>

<template>
  <SectionPanel tone="sand">
    <p v-if="loading" class="text-bff-blue-grey">Loading product...</p>
    <div v-else-if="product" class="grid gap-8 lg:grid-cols-2">
      <div class="overflow-hidden rounded-3xl border border-black/10 bg-white">
        <img v-if="product.imageUrl" class="h-full w-full object-cover" :src="mediaUrl(product.imageUrl)" :alt="product.title" />
      </div>
      <div>
        <h1 class="font-display text-4xl">{{ product.title }}</h1>
        <p class="mt-4 whitespace-pre-wrap text-bff-blue-grey">{{ product.description }}</p>
        <p class="mt-6 text-xl font-semibold text-bff-deep">{{ formatCurrency(selectedVariant?.price ?? 0) }}</p>

        <div class="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <select v-model="selectedVariantId" class="rounded-xl border border-black/15 px-3 py-2">
            <option v-for="variant in product.variants" :key="variant.id" :value="variant.id">
              {{ variant.title }} · {{ variant.inventoryStatus.replaceAll('_', ' ') }}
            </option>
          </select>
          <input v-model.number="quantity" type="number" min="1" class="w-24 rounded-xl border border-black/15 px-3 py-2" />
        </div>

        <button class="bff-button-primary mt-5" @click="addToCart">Add to cart</button>
        <p v-if="addedNotice" class="mt-3 text-sm text-green-700">{{ addedNotice }}</p>
      </div>
    </div>
    <p v-else class="text-bff-blue-grey">Product not found.</p>
  </SectionPanel>
</template>
