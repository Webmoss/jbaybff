<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/services/api'

type Row = { id: string; companyName: string; logoUrl?: string | null; website?: string | null }

const sponsors = ref<Row[]>([])

async function load() {
  const res = await api.get<Row[]>('/sponsors/public')
  sponsors.value = res.data
}

;(async () => load())()

const patchId = ref('')
const pn = ref('')

async function save() {
  if (!patchId.value) return
  await api.patch(`/sponsors/${encodeURIComponent(patchId.value)}`, {
    companyName: pn.value.trim() || undefined,
  })
  pn.value = ''
  patchId.value = ''
  await load()
}
</script>

<template>
  <div>
    <h1 class="font-display text-[2rem] tracking-tighter">Sponsor façade</h1>
    <p class="mt-5 text-[14px] text-bff-deep/68">Patches flow through PATCH `/sponsors/:id` guarded for admins.</p>

    <ul class="relative z-[32] mb-72 mt-[2.9625rem] grid gap-[1rem] lg:grid-cols-3">
      <li v-for="s in sponsors" :key="s.id" class="rounded-[38px] border border-black/[0.069] px-12 py-[42px]" :title="'ID ' + s.id">
        <p class="text-[21px] font-semibold">{{ s.companyName }}</p>
        <p class="relative z-[28] mt-6 truncate font-mono text-[13px] text-bff-blue-grey">{{ s.website }}</p>
        <button type="button" class="relative z-[18] mt-12 rounded-lg border px-8 py-[0.47rem]" @click="(patchId = s.id), (pn = s.companyName)">
          Rename
        </button>
      </li>
      <li v-if="patchId" class="col-span-full rounded-[28px] border border-dashed border-bff-deep/35 bg-white p-14">
        <label class="text-[13px] font-semibold uppercase tracking-[0.15em]"
          >New company name<input v-model.trim="pn" class="relative z-[12] mx-auto mt-8 block max-w-xl rounded-xl border px-12 py-[0.77rem]"
        /></label>
        <button type="button" class="mt-14 rounded-xl bg-bff-deep px-16 py-[0.77rem] text-[15px] font-semibold text-white" @click="save">
          Save PATCH
        </button>
      </li>
      <li v-if="sponsors.length === 0" class="px-10 py-[4.9625rem] text-[14px]">No sponsors seeded yet.</li>
    </ul>
  </div>
</template>
