<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/services/api'

type Row = {
  id: string
  title: string
  slug: string
  status: string
  published: boolean
}

const rows = ref<Row[]>([])
const title = ref('New shoreline initiative')
const description = ref('Describe impact, partners, and timelines.')
const status = ref<'DRAFT' | 'ACTIVE' | 'COMPLETED'>('DRAFT')
const published = ref(false)
const busy = ref(false)

async function load() {
  const res = await api.get<Row[]>('/campaigns/admin/all')
  rows.value = res.data
}

;(async () => load())()

async function createOne() {
  busy.value = true
  try {
    await api.post('/campaigns', {
      title: title.value,
      description: description.value,
      status: status.value,
      published: published.value,
      featured: false,
    })
    await load()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-14">
    <header>
      <h1 class="font-display text-[2.1rem] tracking-tight">Campaign builder</h1>
      <p class="mt-3 max-w-xl text-[15px] text-bff-deep/70">Admin-only POST integrates slugify + optional sponsor graph on the API.</p>
    </header>

    <section class="rounded-3xl border border-black/10 bg-white p-10 shadow-sm space-y-6 max-w-3xl">
      <h2 class="text-lg font-semibold">Composer</h2>
      <label class="block text-xs font-semibold uppercase tracking-widest text-bff-deep/60">Title</label>
      <input v-model="title" class="w-full rounded-xl border px-4 py-3" />
      <label class="block text-xs font-semibold uppercase tracking-widest text-bff-deep/60">Narrative</label>
      <textarea v-model="description" rows="5" class="w-full rounded-xl border px-4 py-3 text-[15px] leading-relaxed" />
      <div class="flex flex-wrap items-center gap-8">
        <label class="text-sm font-semibold text-bff-deep/80 flex items-center gap-2">
          Status
          <select v-model="status" class="rounded-lg border px-3 py-2">
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </label>
        <label class="flex items-center gap-2 text-sm font-semibold">
          <input v-model="published" type="checkbox" class="size-5 accent-bff-deep" />
          Visible on homepage feed
        </label>
      </div>
      <button
        type="button"
        class="rounded-xl bg-bff-deep px-8 py-3 text-[15px] font-semibold text-white hover:bg-[#074e70] disabled:opacity-50"
        :disabled="busy"
        @click="createOne"
      >
        {{ busy ? 'Saving…' : 'Create campaign record' }}
      </button>
    </section>

    <section aria-labelledby="clist">
      <h2 id="clist" class="font-display text-xl">Live records</h2>
      <div class="mt-6 overflow-auto rounded-2xl border border-black/[0.08]">
        <table class="min-w-[560px] w-full text-left text-[15px]">
          <thead class="border-b bg-stone-200/70 text-[11px] uppercase tracking-[0.2em] text-bff-deep/70">
            <tr>
              <th class="px-6 py-4">Campaign</th>
              <th class="px-6 py-4">Slug</th>
              <th class="px-6 py-4">Cycle</th>
              <th class="px-6 py-4">Listed</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" class="border-t border-black/[0.05] [&>td]:px-6 [&>td]:py-5">
              <td>{{ row.title }}</td>
              <td><code>{{ row.slug }}</code></td>
              <td>{{ row.status }}</td>
              <td>{{ row.published ? 'Yes' : 'No' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
