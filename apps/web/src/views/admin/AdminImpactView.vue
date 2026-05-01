<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/services/api'

type ImpactAdmin = {
  days: number
  donations: number
  actions: number
  actionSubmissions: number
  eventRsvps: number
  kpi: { eventName: string; count: number }[]
}

const summary = ref<ImpactAdmin | null>(null)

onMounted(async () => {
  summary.value = (await api.get<ImpactAdmin>('/impact/admin/summary?days=30')).data
})
</script>

<template>
  <div class="space-y-10">
    <header>
      <h1 class="font-display text-3xl">Impact analytics</h1>
      <p class="mt-3 text-sm text-bff-blue-grey">30-day platform signals for donations, action conversions, and volunteer demand.</p>
    </header>

    <div v-if="summary" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article class="rounded-2xl border border-black/10 bg-white px-5 py-4">
        <p class="text-xs uppercase tracking-[0.14em] text-bff-blue-grey">Donations</p>
        <p class="mt-2 text-2xl font-semibold">{{ summary.donations }}</p>
      </article>
      <article class="rounded-2xl border border-black/10 bg-white px-5 py-4">
        <p class="text-xs uppercase tracking-[0.14em] text-bff-blue-grey">Actions</p>
        <p class="mt-2 text-2xl font-semibold">{{ summary.actions }}</p>
      </article>
      <article class="rounded-2xl border border-black/10 bg-white px-5 py-4">
        <p class="text-xs uppercase tracking-[0.14em] text-bff-blue-grey">Action submissions</p>
        <p class="mt-2 text-2xl font-semibold">{{ summary.actionSubmissions }}</p>
      </article>
      <article class="rounded-2xl border border-black/10 bg-white px-5 py-4">
        <p class="text-xs uppercase tracking-[0.14em] text-bff-blue-grey">Event RSVPs</p>
        <p class="mt-2 text-2xl font-semibold">{{ summary.eventRsvps }}</p>
      </article>
    </div>

    <section v-if="summary" class="rounded-2xl border border-black/10 bg-white p-6">
      <h2 class="font-semibold">Top KPI events</h2>
      <ul class="mt-4 grid gap-2 text-sm">
        <li v-for="item in summary.kpi" :key="item.eventName" class="flex items-center justify-between border-b border-black/5 pb-2">
          <span>{{ item.eventName }}</span>
          <strong>{{ item.count }}</strong>
        </li>
      </ul>
    </section>
  </div>
</template>
