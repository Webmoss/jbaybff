<script setup lang="ts">
import { computed, ref } from 'vue'
import { api } from '@/services/api'

type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'PREORDER'
type OrderStatus = 'PENDING' | 'PAID' | 'FULFILLED' | 'CANCELLED' | 'REFUNDED'
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
type FulfillmentStatus = 'UNFULFILLED' | 'PACKING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

type VariantRow = {
  id: string
  sku: string
  title: string
  optionLabel: string | null
  price: string
  compareAtPrice: string | null
  inventoryQty: number
  inventoryStatus: InventoryStatus
  isDefault: boolean
  isActive: boolean
}

type ProductRow = {
  id: string
  title: string
  slug: string
  description: string
  category: string | null
  imageUrl: string | null
  status: ProductStatus
  variants: VariantRow[]
}

type OrderItemRow = {
  id: string
  productTitle: string
  variantTitle: string | null
  sku: string | null
  quantity: number
  lineTotal: string
}

type OrderRow = {
  id: string
  reference: string
  customerEmail: string
  customerName: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  fulfillmentStatus: FulfillmentStatus
  totalAmount: string
  trackingRef: string | null
  createdAt: string
  items: OrderItemRow[]
}

type EditableVariant = {
  sku: string
  title: string
  optionLabel: string
  price: number
  compareAtPrice: number | null
  inventoryQty: number
  inventoryStatus: InventoryStatus
  isDefault: boolean
  isActive: boolean
}

const products = ref<ProductRow[]>([])
const orders = ref<OrderRow[]>([])
const busy = ref(false)
const saveBusy = ref(false)
const errorText = ref('')
const selectedProductId = ref('')

const productForm = ref({
  title: '',
  slug: '',
  description: '',
  category: '',
  imageUrl: '',
  status: 'DRAFT' as ProductStatus,
  variants: [
    {
      sku: '',
      title: '',
      optionLabel: '',
      price: 0,
      compareAtPrice: null,
      inventoryQty: 0,
      inventoryStatus: 'IN_STOCK' as InventoryStatus,
      isDefault: true,
      isActive: true,
    },
  ] as EditableVariant[],
})

const orderStatusDrafts = ref<Record<string, { status: OrderStatus; paymentStatus: PaymentStatus; fulfillmentStatus: FulfillmentStatus; trackingRef: string }>>({})

function formatCurrency(value: string | number) {
  const amount = typeof value === 'string' ? Number(value) : value
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
}

const isEditing = computed(() => !!selectedProductId.value)

function resetForm() {
  selectedProductId.value = ''
  productForm.value = {
    title: '',
    slug: '',
    description: '',
    category: '',
    imageUrl: '',
    status: 'DRAFT',
    variants: [
      {
        sku: '',
        title: '',
        optionLabel: '',
        price: 0,
        compareAtPrice: null,
        inventoryQty: 0,
        inventoryStatus: 'IN_STOCK',
        isDefault: true,
        isActive: true,
      },
    ],
  }
}

function addVariant() {
  productForm.value.variants.push({
    sku: '',
    title: '',
    optionLabel: '',
    price: 0,
    compareAtPrice: null,
    inventoryQty: 0,
    inventoryStatus: 'IN_STOCK',
    isDefault: false,
    isActive: true,
  })
}

function removeVariant(index: number) {
  productForm.value.variants.splice(index, 1)
  if (!productForm.value.variants.some((variant) => variant.isDefault) && productForm.value.variants[0]) {
    productForm.value.variants[0].isDefault = true
  }
}

function selectDefaultVariant(index: number) {
  productForm.value.variants = productForm.value.variants.map((variant, idx) => ({
    ...variant,
    isDefault: idx === index,
  }))
}

function editProduct(product: ProductRow) {
  selectedProductId.value = product.id
  productForm.value = {
    title: product.title,
    slug: product.slug,
    description: product.description,
    category: product.category ?? '',
    imageUrl: product.imageUrl ?? '',
    status: product.status,
    variants: product.variants.map((variant) => ({
      sku: variant.sku,
      title: variant.title,
      optionLabel: variant.optionLabel ?? '',
      price: Number(variant.price),
      compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : null,
      inventoryQty: variant.inventoryQty,
      inventoryStatus: variant.inventoryStatus,
      isDefault: variant.isDefault,
      isActive: variant.isActive,
    })),
  }
}

async function loadAll() {
  busy.value = true
  errorText.value = ''
  try {
    const [productsRes, ordersRes] = await Promise.all([
      api.get<ProductRow[]>('/shop/admin/products'),
      api.get<OrderRow[]>('/shop/admin/orders'),
    ])
    products.value = productsRes.data
    orders.value = ordersRes.data
    orderStatusDrafts.value = Object.fromEntries(
      ordersRes.data.map((order) => [
        order.id,
        {
          status: order.status,
          paymentStatus: order.paymentStatus,
          fulfillmentStatus: order.fulfillmentStatus,
          trackingRef: order.trackingRef ?? '',
        },
      ]),
    )
  } catch {
    errorText.value = 'Unable to load shop admin data.'
  } finally {
    busy.value = false
  }
}

async function saveProduct() {
  if (!productForm.value.title.trim() || !productForm.value.description.trim() || !productForm.value.variants.length) return
  saveBusy.value = true
  errorText.value = ''
  try {
    const payload = {
      title: productForm.value.title.trim(),
      slug: productForm.value.slug.trim() || undefined,
      description: productForm.value.description.trim(),
      category: productForm.value.category.trim() || undefined,
      imageUrl: productForm.value.imageUrl.trim() || undefined,
      status: productForm.value.status,
      variants: productForm.value.variants.map((variant) => ({
        sku: variant.sku.trim(),
        title: variant.title.trim(),
        optionLabel: variant.optionLabel.trim() || undefined,
        price: Number(variant.price),
        compareAtPrice: variant.compareAtPrice ?? undefined,
        inventoryQty: Number(variant.inventoryQty),
        inventoryStatus: variant.inventoryStatus,
        isDefault: variant.isDefault,
        isActive: variant.isActive,
      })),
    }
    if (selectedProductId.value) {
      await api.patch(`/shop/admin/products/${encodeURIComponent(selectedProductId.value)}`, payload)
    } else {
      await api.post('/shop/admin/products', payload)
    }
    await loadAll()
    resetForm()
  } catch {
    errorText.value = 'Could not save product. Check required fields and SKU uniqueness.'
  } finally {
    saveBusy.value = false
  }
}

async function updateOrder(orderId: string) {
  const draft = orderStatusDrafts.value[orderId]
  if (!draft) return
  try {
    await api.patch(`/shop/admin/orders/${encodeURIComponent(orderId)}/status`, draft)
    await loadAll()
  } catch {
    errorText.value = 'Could not update order status.'
  }
}

void loadAll()
</script>

<template>
  <div class="space-y-12">
    <header>
      <h1 class="font-display text-3xl">Shop operations</h1>
      <p class="mt-2 text-sm text-bff-blue-grey">Manage products, variants, inventory, and order fulfillment transitions.</p>
    </header>

    <p v-if="errorText" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorText }}</p>

    <section class="grid gap-8 xl:grid-cols-[1.1fr_1fr]">
      <div class="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold">{{ isEditing ? 'Edit product' : 'New product' }}</h2>
          <button class="text-sm font-semibold text-bff-coral" @click="resetForm">Reset</button>
        </div>
        <div class="grid gap-3">
          <input v-model="productForm.title" class="rounded-xl border border-black/15 px-3 py-2 text-sm" placeholder="Product title" />
          <input v-model="productForm.slug" class="rounded-xl border border-black/15 px-3 py-2 text-sm" placeholder="Slug (optional)" />
          <textarea v-model="productForm.description" rows="4" class="rounded-xl border border-black/15 px-3 py-2 text-sm" placeholder="Description" />
          <div class="grid gap-3 sm:grid-cols-2">
            <input v-model="productForm.category" class="rounded-xl border border-black/15 px-3 py-2 text-sm" placeholder="Category" />
            <select v-model="productForm.status" class="rounded-xl border border-black/15 px-3 py-2 text-sm">
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
          <input v-model="productForm.imageUrl" class="rounded-xl border border-black/15 px-3 py-2 text-sm" placeholder="Image URL (optional)" />
        </div>

        <div class="mt-6 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold uppercase tracking-[0.14em] text-bff-blue-grey">Variants</h3>
            <button class="text-sm font-semibold text-bff-deep" @click="addVariant">+ Add variant</button>
          </div>
          <article v-for="(variant, idx) in productForm.variants" :key="idx" class="rounded-2xl border border-black/10 p-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <input v-model="variant.sku" class="rounded-xl border border-black/15 px-3 py-2 text-sm" placeholder="SKU" />
              <input v-model="variant.title" class="rounded-xl border border-black/15 px-3 py-2 text-sm" placeholder="Variant title" />
              <input v-model="variant.optionLabel" class="rounded-xl border border-black/15 px-3 py-2 text-sm" placeholder="Option label" />
              <input v-model.number="variant.price" type="number" min="0" step="0.01" class="rounded-xl border border-black/15 px-3 py-2 text-sm" placeholder="Price" />
              <input v-model.number="variant.compareAtPrice" type="number" min="0" step="0.01" class="rounded-xl border border-black/15 px-3 py-2 text-sm" placeholder="Compare-at price" />
              <input v-model.number="variant.inventoryQty" type="number" min="0" class="rounded-xl border border-black/15 px-3 py-2 text-sm" placeholder="Inventory qty" />
              <select v-model="variant.inventoryStatus" class="rounded-xl border border-black/15 px-3 py-2 text-sm sm:col-span-2">
                <option value="IN_STOCK">IN_STOCK</option>
                <option value="LOW_STOCK">LOW_STOCK</option>
                <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                <option value="PREORDER">PREORDER</option>
              </select>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <label class="inline-flex items-center gap-2">
                <input :checked="variant.isDefault" type="checkbox" @change="selectDefaultVariant(idx)" />
                Default
              </label>
              <label class="inline-flex items-center gap-2">
                <input v-model="variant.isActive" type="checkbox" />
                Active
              </label>
              <button v-if="productForm.variants.length > 1" class="ml-auto text-bff-coral" @click="removeVariant(idx)">Remove</button>
            </div>
          </article>
        </div>

        <button
          class="bff-button-primary mt-6"
          :disabled="saveBusy || !productForm.title.trim() || !productForm.description.trim()"
          @click="saveProduct"
        >
          {{ saveBusy ? 'Saving...' : isEditing ? 'Update product' : 'Create product' }}
        </button>
      </div>

      <div class="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold">Products</h2>
          <button class="text-sm font-semibold text-bff-deep" :disabled="busy" @click="loadAll">{{ busy ? 'Refreshing...' : 'Refresh' }}</button>
        </div>
        <div class="space-y-3">
          <article v-for="product in products" :key="product.id" class="rounded-2xl border border-black/10 p-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="font-semibold">{{ product.title }}</p>
                <p class="text-xs text-bff-blue-grey">{{ product.slug }} · {{ product.status }}</p>
                <p class="mt-1 text-xs text-bff-blue-grey">{{ product.variants.length }} variant(s)</p>
              </div>
              <button class="text-sm font-semibold text-bff-coral" @click="editProduct(product)">Edit</button>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
      <h2 class="text-lg font-semibold">Orders</h2>
      <div class="mt-5 space-y-4">
        <article v-for="order in orders" :key="order.id" class="rounded-2xl border border-black/10 p-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="font-semibold">{{ order.reference }} · {{ order.customerName }}</p>
              <p class="text-xs text-bff-blue-grey">{{ order.customerEmail }} · {{ new Date(order.createdAt).toLocaleString() }}</p>
              <p class="mt-1 text-sm font-semibold">{{ formatCurrency(order.totalAmount) }}</p>
            </div>
            <div class="grid gap-2 sm:grid-cols-3">
              <select v-model="orderStatusDrafts[order.id].status" class="rounded-xl border border-black/15 px-3 py-2 text-sm">
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="FULFILLED">FULFILLED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
              <select v-model="orderStatusDrafts[order.id].paymentStatus" class="rounded-xl border border-black/15 px-3 py-2 text-sm">
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="FAILED">FAILED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
              <select v-model="orderStatusDrafts[order.id].fulfillmentStatus" class="rounded-xl border border-black/15 px-3 py-2 text-sm">
                <option value="UNFULFILLED">UNFULFILLED</option>
                <option value="PACKING">PACKING</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div class="mt-3">
            <input
              v-model="orderStatusDrafts[order.id].trackingRef"
              class="w-full rounded-xl border border-black/15 px-3 py-2 text-sm"
              placeholder="Tracking reference"
            />
          </div>

          <ul class="mt-3 space-y-1 text-xs text-bff-blue-grey">
            <li v-for="item in order.items" :key="item.id">
              {{ item.productTitle }}{{ item.variantTitle ? ` (${item.variantTitle})` : '' }} · {{ item.quantity }} × {{ formatCurrency(item.lineTotal) }}
            </li>
          </ul>

          <button class="mt-4 rounded-xl bg-bff-deep px-4 py-2 text-sm font-semibold text-white hover:bg-[#074e70]" @click="updateOrder(order.id)">
            Save order status
          </button>
        </article>
      </div>
    </section>
  </div>
</template>
