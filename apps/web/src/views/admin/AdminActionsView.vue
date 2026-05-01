<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/services/api'

type ActionRow = {
  id: string
  title: string
  slug: string
  status: string
  type: string
  published: boolean
  _count?: { submissions: number }
}

const rows = ref<ActionRow[]>([])
const form = ref({
  title: 'Protect dune corridors',
  summary: 'Pledge support for dune restoration and access compliance.',
  description: 'Collect supporter commitments for municipal action.',
  type: 'PLEDGE',
  status: 'ACTIVE',
  published: true,
})

async function load() {
  rows.value = (await api.get<ActionRow[]>('/actions/admin/all')).data
}

async function create() {
  await api.post('/actions/admin', form.value)
  await load()
}

onMounted(() => void load())
</script>

<template>
  <div class="space-y-12">
    <header>
      <h1 class="font-display text-3xl">Action Center admin</h1>
      <p class="mt-3 text-sm text-bff-blue-grey">Publish petitions, pledges, and action CTAs linked to campaigns.</p>
    </header>

    <section class="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
      <h2 class="font-semibold">Create action</h2>
      <div class="mt-5 grid gap-4">
        <input v-model="form.title" class="rounded-xl border px-4 py-3" />
        <input v-model="form.summary" class="rounded-xl border px-4 py-3" />
        <textarea v-model="form.description" rows="4" class="rounded-xl border px-4 py-3" />
      </div>
      <button type="button" class="mt-5 rounded-xl bg-bff-deep px-6 py-2.5 text-sm font-semibold text-white" @click="create">Create</button>
    </section>

    <section class="overflow-auto rounded-2xl border border-black/[0.08]">
      <table class="min-w-[700px] w-full text-left text-sm">
        <thead class="bg-stone-200/70 text-xs uppercase tracking-[0.15em] text-bff-deep/70">
          <tr>
            <th class="px-5 py-4">Title</th>
            <th class="px-5 py-4">Type</th>
            <th class="px-5 py-4">Status</th>
            <th class="px-5 py-4">Published</th>
            <th class="px-5 py-4">Submissions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id" class="border-t border-black/[0.06] [&>td]:px-5 [&>td]:py-4">
            <td>{{ row.title }}</td>
            <td>{{ row.type }}</td>
            <td>{{ row.status }}</td>
            <td>{{ row.published ? 'Yes' : 'No' }}</td>
            <td>{{ row._count?.submissions ?? 0 }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
