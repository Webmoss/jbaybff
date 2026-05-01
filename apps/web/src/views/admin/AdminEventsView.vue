<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/services/api'

type EventRow = {
  id: string
  title: string
  slug: string
  location: string
  startsAt: string
  status: string
  published: boolean
  _count?: { rsvps: number }
}

const rows = ref<EventRow[]>([])
const form = ref({
  title: 'JBay Beach Cleanup',
  description: 'Monthly cleanup and awareness walk.',
  location: 'Main Beach',
  startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
  status: 'PUBLISHED',
  published: true,
})

async function load() {
  rows.value = (await api.get<EventRow[]>('/events/admin/all')).data
}

async function create() {
  await api.post('/events/admin', form.value)
  await load()
}

onMounted(() => void load())
</script>

<template>
  <div class="space-y-12">
    <header>
      <h1 class="font-display text-3xl">Events operations</h1>
      <p class="mt-3 text-sm text-bff-blue-grey">Publish cleanup and outreach events and monitor RSVP demand.</p>
    </header>

    <section class="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
      <h2 class="font-semibold">Create event</h2>
      <div class="mt-5 grid gap-4">
        <input v-model="form.title" class="rounded-xl border px-4 py-3" />
        <input v-model="form.location" class="rounded-xl border px-4 py-3" />
        <textarea v-model="form.description" rows="3" class="rounded-xl border px-4 py-3" />
      </div>
      <button type="button" class="mt-5 rounded-xl bg-bff-deep px-6 py-2.5 text-sm font-semibold text-white" @click="create">Create</button>
    </section>

    <section class="overflow-auto rounded-2xl border border-black/[0.08]">
      <table class="min-w-[760px] w-full text-left text-sm">
        <thead class="bg-stone-200/70 text-xs uppercase tracking-[0.15em] text-bff-deep/70">
          <tr>
            <th class="px-5 py-4">Event</th>
            <th class="px-5 py-4">When</th>
            <th class="px-5 py-4">Status</th>
            <th class="px-5 py-4">Published</th>
            <th class="px-5 py-4">RSVPs</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id" class="border-t border-black/[0.06] [&>td]:px-5 [&>td]:py-4">
            <td>
              <p class="font-semibold">{{ row.title }}</p>
              <p class="text-xs text-bff-blue-grey">{{ row.location }}</p>
            </td>
            <td>{{ new Date(row.startsAt).toLocaleString() }}</td>
            <td>{{ row.status }}</td>
            <td>{{ row.published ? 'Yes' : 'No' }}</td>
            <td>{{ row._count?.rsvps ?? 0 }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
