<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '@/services/api'

type PartnershipRow = {
  id: string
  organization: string
  contactName: string
  contactEmail: string
  type: string
  status: 'NEW' | 'IN_REVIEW' | 'APPROVED' | 'DECLINED'
  pledgeAmount?: string | null
  createdAt: string
  reviewedBy?: string | null
  reviewedAt?: string | null
  notes?: string | null
}

type Summary = {
  total: number
  NEW: number
  IN_REVIEW: number
  APPROVED: number
  DECLINED: number
}

const rows = ref<PartnershipRow[]>([])
const summary = ref<Summary | null>(null)
const updating = ref<string | null>(null)
const notes = reactive<Record<string, string>>({})
const statusFilter = ref<'all' | PartnershipRow['status']>('all')
const selectedIds = ref<string[]>([])
const bulkNotes = ref('')
const pendingBulkStatus = ref<PartnershipRow['status'] | null>(null)
const actionNotice = ref('')
const exporting = ref(false)
const exportFrom = ref('')
const exportTo = ref('')
const exportPreset = ref<'custom' | 'today' | 'this-month' | 'last-month' | 'last-30' | 'all-time'>('all-time')

async function load() {
  const [rowsRes, summaryRes] = await Promise.all([
    api.get<PartnershipRow[]>('/partnerships/admin/all'),
    api.get<Summary>('/partnerships/admin/summary'),
  ])
  rows.value = rowsRes.data
  summary.value = summaryRes.data
}

const filteredRows = computed(() => rows.value.filter((r) => statusFilter.value === 'all' || r.status === statusFilter.value))
const allFilteredSelected = computed(
  () => filteredRows.value.length > 0 && filteredRows.value.every((r) => selectedIds.value.includes(r.id)),
)
const exportRangeLabel = computed(() => {
  if (!exportFrom.value && !exportTo.value) return 'All time'
  if (exportFrom.value && exportTo.value) return `${exportFrom.value} to ${exportTo.value}`
  if (exportFrom.value) return `From ${exportFrom.value}`
  return `Up to ${exportTo.value}`
})

function toggleSelect(id: string) {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((v) => v !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

function toggleSelectAllFiltered() {
  if (allFilteredSelected.value) {
    const visible = new Set(filteredRows.value.map((r) => r.id))
    selectedIds.value = selectedIds.value.filter((id) => !visible.has(id))
    return
  }
  const merged = new Set([...selectedIds.value, ...filteredRows.value.map((r) => r.id)])
  selectedIds.value = Array.from(merged)
}

async function updateStatus(row: PartnershipRow, status: PartnershipRow['status']) {
  updating.value = row.id
  actionNotice.value = ''
  try {
    await api.patch(`/partnerships/admin/${encodeURIComponent(row.id)}`, {
      status,
      notes: notes[row.id] || undefined,
    })
    await load()
    actionNotice.value = `Updated ${row.organization} to ${status}.`
  } catch {
    actionNotice.value = `Could not update ${row.organization}. Please try again.`
  } finally {
    updating.value = null
  }
}

async function bulkUpdate(status: PartnershipRow['status']) {
  if (selectedIds.value.length === 0) return
  updating.value = '__bulk__'
  actionNotice.value = ''
  const targetCount = selectedIds.value.length
  try {
    await api.patch('/partnerships/admin/bulk', {
      ids: selectedIds.value,
      status,
      notes: bulkNotes.value || undefined,
    })
    selectedIds.value = []
    bulkNotes.value = ''
    await load()
    actionNotice.value = `Updated ${targetCount} inquiries to ${status}.`
  } catch {
    actionNotice.value = 'Bulk update failed. Please try again.'
  } finally {
    updating.value = null
  }
}

function askBulkConfirm(status: PartnershipRow['status']) {
  if (selectedIds.value.length === 0) return
  pendingBulkStatus.value = status
}

async function confirmBulkUpdate() {
  if (!pendingBulkStatus.value) return
  await bulkUpdate(pendingBulkStatus.value)
  pendingBulkStatus.value = null
}

async function exportCsv() {
  if (exportFrom.value && exportTo.value && exportFrom.value > exportTo.value) {
    actionNotice.value = 'Export range is invalid: "From" must be before "To".'
    return
  }
  exporting.value = true
  actionNotice.value = ''
  try {
    const res = await api.get('/partnerships/admin/export.csv', {
      params: {
        ...(exportFrom.value ? { from: new Date(`${exportFrom.value}T00:00:00.000Z`).toISOString() } : {}),
        ...(exportTo.value ? { to: new Date(`${exportTo.value}T23:59:59.999Z`).toISOString() } : {}),
      },
      responseType: 'blob',
    })
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = buildExportFilename()
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    actionNotice.value = 'CSV export downloaded.'
  } catch {
    actionNotice.value = 'CSV export failed. Please try again.'
  } finally {
    exporting.value = false
  }
}

function toInputDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function setAllTimeRange() {
  exportFrom.value = ''
  exportTo.value = ''
  exportPreset.value = 'all-time'
}

function setTodayRange() {
  const now = new Date()
  const iso = toInputDate(now)
  exportFrom.value = iso
  exportTo.value = iso
  exportPreset.value = 'today'
}

function setThisMonthRange() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  exportFrom.value = toInputDate(start)
  exportTo.value = toInputDate(now)
  exportPreset.value = 'this-month'
}

function setLastMonthRange() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  exportFrom.value = toInputDate(start)
  exportTo.value = toInputDate(end)
  exportPreset.value = 'last-month'
}

function setLast30DaysRange() {
  const now = new Date()
  const from = new Date(now)
  from.setDate(now.getDate() - 30)
  exportFrom.value = toInputDate(from)
  exportTo.value = toInputDate(now)
  exportPreset.value = 'last-30'
}

function onCustomDateEdit() {
  exportPreset.value = 'custom'
}

function buildExportFilename() {
  if (!exportFrom.value && !exportTo.value) return 'partnership-inquiries-all-time.csv'
  if (exportFrom.value && exportTo.value) return `partnership-inquiries-${exportFrom.value}_to_${exportTo.value}.csv`
  if (exportFrom.value) return `partnership-inquiries-from_${exportFrom.value}.csv`
  return `partnership-inquiries-up_to_${exportTo.value}.csv`
}

onMounted(() => void load())
</script>

<template>
  <div class="space-y-10">
    <header>
      <h1 class="font-display text-3xl">Partnership inquiries</h1>
      <p class="mt-3 text-sm text-bff-blue-grey">Review and progress partner pipeline submissions.</p>
    </header>

    <section v-if="summary" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <article class="rounded-2xl border border-black/10 bg-white px-4 py-4">
        <p class="text-xs uppercase tracking-[0.15em] text-bff-blue-grey">Total</p>
        <p class="mt-2 font-display text-2xl">{{ summary.total }}</p>
      </article>
      <article class="rounded-2xl border border-black/10 bg-white px-4 py-4">
        <p class="text-xs uppercase tracking-[0.15em] text-bff-blue-grey">New</p>
        <p class="mt-2 font-display text-2xl">{{ summary.NEW }}</p>
      </article>
      <article class="rounded-2xl border border-black/10 bg-white px-4 py-4">
        <p class="text-xs uppercase tracking-[0.15em] text-bff-blue-grey">In review</p>
        <p class="mt-2 font-display text-2xl">{{ summary.IN_REVIEW }}</p>
      </article>
      <article class="rounded-2xl border border-black/10 bg-white px-4 py-4">
        <p class="text-xs uppercase tracking-[0.15em] text-bff-blue-grey">Approved</p>
        <p class="mt-2 font-display text-2xl">{{ summary.APPROVED }}</p>
      </article>
      <article class="rounded-2xl border border-black/10 bg-white px-4 py-4">
        <p class="text-xs uppercase tracking-[0.15em] text-bff-blue-grey">Declined</p>
        <p class="mt-2 font-display text-2xl">{{ summary.DECLINED }}</p>
      </article>
    </section>

    <section class="flex flex-wrap gap-2">
      <button type="button" class="rounded-full border px-4 py-2 text-xs font-semibold" :class="statusFilter === 'all' ? 'bg-bff-deep text-white border-bff-deep' : ''" @click="statusFilter = 'all'">All</button>
      <button type="button" class="rounded-full border px-4 py-2 text-xs font-semibold" :class="statusFilter === 'NEW' ? 'bg-bff-deep text-white border-bff-deep' : ''" @click="statusFilter = 'NEW'">New</button>
      <button type="button" class="rounded-full border px-4 py-2 text-xs font-semibold" :class="statusFilter === 'IN_REVIEW' ? 'bg-bff-deep text-white border-bff-deep' : ''" @click="statusFilter = 'IN_REVIEW'">In review</button>
      <button type="button" class="rounded-full border px-4 py-2 text-xs font-semibold" :class="statusFilter === 'APPROVED' ? 'bg-bff-deep text-white border-bff-deep' : ''" @click="statusFilter = 'APPROVED'">Approved</button>
      <button type="button" class="rounded-full border px-4 py-2 text-xs font-semibold" :class="statusFilter === 'DECLINED' ? 'bg-bff-deep text-white border-bff-deep' : ''" @click="statusFilter = 'DECLINED'">Declined</button>
    </section>

    <section class="rounded-2xl border border-black/[0.08] bg-white p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold text-bff-deep">Export reports</h2>
          <p class="mt-1 text-xs text-bff-blue-grey">Download partnership inquiries for a preset or custom date range.</p>
        </div>
        <button type="button" class="rounded-lg border px-4 py-2 text-xs font-semibold" :disabled="exporting" @click="exportCsv">
          {{ exporting ? 'Exporting…' : 'Export CSV' }}
        </button>
      </div>

      <div class="mt-3 flex flex-wrap gap-2">
      <button type="button" class="rounded-full border px-4 py-2 text-xs font-semibold" :class="exportPreset === 'today' ? 'bg-bff-deep text-white border-bff-deep' : ''" @click="setTodayRange">Today</button>
      <button type="button" class="rounded-full border px-4 py-2 text-xs font-semibold" :class="exportPreset === 'this-month' ? 'bg-bff-deep text-white border-bff-deep' : ''" @click="setThisMonthRange">This month</button>
      <button type="button" class="rounded-full border px-4 py-2 text-xs font-semibold" :class="exportPreset === 'last-month' ? 'bg-bff-deep text-white border-bff-deep' : ''" @click="setLastMonthRange">Last month</button>
      <button type="button" class="rounded-full border px-4 py-2 text-xs font-semibold" :class="exportPreset === 'last-30' ? 'bg-bff-deep text-white border-bff-deep' : ''" @click="setLast30DaysRange">Last 30 days</button>
      <button type="button" class="rounded-full border px-4 py-2 text-xs font-semibold" :class="exportPreset === 'all-time' ? 'bg-bff-deep text-white border-bff-deep' : ''" @click="setAllTimeRange">All time</button>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <label class="text-xs font-medium text-bff-blue-grey" for="export-from">From</label>
        <input id="export-from" v-model="exportFrom" type="date" class="rounded-lg border px-3 py-2 text-xs" @input="onCustomDateEdit" />
        <label class="text-xs font-medium text-bff-blue-grey" for="export-to">To</label>
        <input id="export-to" v-model="exportTo" type="date" class="rounded-lg border px-3 py-2 text-xs" @input="onCustomDateEdit" />
      </div>

      <p class="mt-3 text-xs text-bff-blue-grey">
        Active export range:
        <span class="rounded-full bg-stone-200/80 px-2 py-1 font-semibold text-bff-deep">{{ exportRangeLabel }}</span>
      </p>
    </section>

    <section class="rounded-2xl border border-black/[0.08] bg-white p-4">
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="rounded-lg border px-3 py-1.5 text-xs font-semibold" @click="toggleSelectAllFiltered">
          {{ allFilteredSelected ? 'Clear visible selection' : 'Select all visible' }}
        </button>
        <span class="text-xs text-bff-blue-grey">Selected: {{ selectedIds.length }}</span>
        <button type="button" class="rounded-lg border px-3 py-1.5 text-xs font-semibold" :disabled="selectedIds.length === 0 || updating === '__bulk__'" @click="askBulkConfirm('IN_REVIEW')">Bulk In review</button>
        <button type="button" class="rounded-lg border px-3 py-1.5 text-xs font-semibold" :disabled="selectedIds.length === 0 || updating === '__bulk__'" @click="askBulkConfirm('APPROVED')">Bulk Approve</button>
        <button type="button" class="rounded-lg border px-3 py-1.5 text-xs font-semibold" :disabled="selectedIds.length === 0 || updating === '__bulk__'" @click="askBulkConfirm('DECLINED')">Bulk Decline</button>
      </div>
      <textarea v-model="bulkNotes" rows="2" placeholder="Optional notes for bulk update" class="mt-3 w-full rounded-lg border px-3 py-2 text-xs" />
      <div v-if="pendingBulkStatus" class="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <span>Confirm bulk update of {{ selectedIds.length }} inquiries to <strong>{{ pendingBulkStatus }}</strong>?</span>
        <button type="button" class="rounded border border-amber-500 px-2 py-1 font-semibold" :disabled="updating === '__bulk__'" @click="confirmBulkUpdate">Confirm</button>
        <button type="button" class="rounded border border-amber-500 px-2 py-1" @click="pendingBulkStatus = null">Cancel</button>
      </div>
      <p v-if="actionNotice" class="mt-3 text-xs text-bff-blue-grey" role="status">{{ actionNotice }}</p>
    </section>

    <section class="overflow-auto rounded-2xl border border-black/[0.08] bg-white">
      <table class="min-w-[960px] w-full text-left text-sm">
        <thead class="bg-stone-200/70 text-xs uppercase tracking-[0.15em] text-bff-deep/70">
          <tr>
            <th class="px-5 py-4">Select</th>
            <th class="px-5 py-4">Organization</th>
            <th class="px-5 py-4">Contact</th>
            <th class="px-5 py-4">Type</th>
            <th class="px-5 py-4">Pledge</th>
            <th class="px-5 py-4">Status</th>
            <th class="px-5 py-4">Review</th>
            <th class="px-5 py-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredRows" :key="row.id" class="border-t border-black/[0.06] align-top [&>td]:px-5 [&>td]:py-4">
            <td>
              <input type="checkbox" :checked="selectedIds.includes(row.id)" @change="toggleSelect(row.id)" />
            </td>
            <td>
              <p class="font-semibold">{{ row.organization }}</p>
              <p class="text-xs text-bff-blue-grey">{{ new Date(row.createdAt).toLocaleString() }}</p>
            </td>
            <td>
              <p>{{ row.contactName }}</p>
              <p class="text-xs text-bff-blue-grey">{{ row.contactEmail }}</p>
            </td>
            <td>{{ row.type }}</td>
            <td>{{ row.pledgeAmount ?? '—' }}</td>
            <td>{{ row.status }}</td>
            <td>
              <p class="text-xs text-bff-blue-grey">
                {{ row.reviewedBy || '—' }}
              </p>
              <p class="text-xs text-bff-blue-grey">
                {{ row.reviewedAt ? new Date(row.reviewedAt).toLocaleString() : '—' }}
              </p>
              <p v-if="row.notes" class="mt-1 text-xs text-bff-deep/80">{{ row.notes }}</p>
            </td>
            <td class="space-y-2">
              <textarea v-model="notes[row.id]" rows="2" placeholder="Admin notes (optional)" class="w-full rounded-lg border px-3 py-2 text-xs" />
              <div class="flex flex-wrap gap-2">
                <button type="button" class="rounded-lg border px-3 py-1.5 text-xs font-semibold" :disabled="updating === row.id" @click="updateStatus(row, 'IN_REVIEW')">In review</button>
                <button type="button" class="rounded-lg border px-3 py-1.5 text-xs font-semibold" :disabled="updating === row.id" @click="updateStatus(row, 'APPROVED')">Approve</button>
                <button type="button" class="rounded-lg border px-3 py-1.5 text-xs font-semibold" :disabled="updating === row.id" @click="updateStatus(row, 'DECLINED')">Decline</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
