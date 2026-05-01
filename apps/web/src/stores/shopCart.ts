import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const CART_KEY = 'jbaybff_shop_cart'

export interface ShopCartItem {
  variantId: string
  productSlug: string
  productTitle: string
  variantTitle: string
  sku: string
  unitPrice: number
  quantity: number
}

function safeLoad(): ShopCartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ShopCartItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const useShopCartStore = defineStore('shop-cart', () => {
  const items = ref<ShopCartItem[]>(safeLoad())

  const totalItems = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const totalAmount = computed(() => items.value.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))

  function persist() {
    localStorage.setItem(CART_KEY, JSON.stringify(items.value))
  }

  function addItem(item: ShopCartItem) {
    const existing = items.value.find((row) => row.variantId === item.variantId)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      items.value.push({ ...item })
    }
    persist()
  }

  function removeItem(variantId: string) {
    items.value = items.value.filter((item) => item.variantId !== variantId)
    persist()
  }

  function clear() {
    items.value = []
    persist()
  }

  return { items, totalItems, totalAmount, addItem, removeItem, clear }
})
