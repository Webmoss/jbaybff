<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/services/api'
import { trackEvent } from '@/services/kpi'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import HeroBanner from '@/components/ui/HeroBanner.vue'
import ActionCard from '@/components/ui/ActionCard.vue'

type ActionRow = {
  id: string
  title: string
  slug: string
  summary?: string | null
  description: string
  type: string
  targetUrl?: string | null
  campaign?: { title: string; slug: string } | null
}

const rows = ref<ActionRow[]>([])
const submitting = ref<string | null>(null)
const email = ref('')
const name = ref('')
const filter = ref<'all' | 'petition' | 'pledge' | 'email' | 'volunteer'>('all')

async function load() {
  const res = await api.get<ActionRow[]>('/actions/public')
  rows.value = res.data
  trackEvent('actions_hub_viewed', { count: res.data.length })
}

async function submitAction(row: ActionRow) {
  submitting.value = row.id
  try {
    await api.post(`/actions/public/${encodeURIComponent(row.id)}/submit`, {
      email: email.value || undefined,
      name: name.value || undefined,
    })
    trackEvent('action_submitted', { actionSlug: row.slug, type: row.type })
    if (row.targetUrl) window.open(row.targetUrl, '_blank', 'noopener,noreferrer')
  } finally {
    submitting.value = null
  }
}

onMounted(() => void load())
</script>

<template>
  <SectionPanel tone="white">
    <HeroBanner
      kicker="Take action"
      title="Your voice matters — take action for Jeffreys Bay."
      subtitle="Choose petitions, pledges, email actions, and volunteer opportunities that move campaigns forward."
    >
      <div class="mt-6 grid w-full gap-2 sm:flex sm:flex-wrap">
        <button v-for="f in [['all','All'],['petition','Petition'],['pledge','Pledge'],['email','Email'],['volunteer','Volunteer']]"
          :key="f[0]"
          class="bff-button-secondary w-full justify-center sm:w-auto sm:justify-start"
          :class="filter===f[0] ? '!bg-bff-deep !text-white' : ''"
          @click="filter = f[0] as typeof filter"
        >{{ f[1] }}</button>
      </div>
    </HeroBanner>
  </SectionPanel>

  <SectionPanel tone="sand">
    <div class="mt-8 grid gap-4 sm:grid-cols-2">
      <label class="grid gap-1.5 text-sm font-medium text-bff-deep/85">
        Email (optional)
        <input v-model="email" type="email" placeholder="you@example.com" class="rounded-xl border px-4 py-3" />
      </label>
      <label class="grid gap-1.5 text-sm font-medium text-bff-deep/85">
        Name (optional)
        <input v-model="name" type="text" placeholder="Your name" class="rounded-xl border px-4 py-3" />
      </label>
    </div>

    <ul class="mt-10 grid gap-5">
      <li v-for="row in rows.filter((r) => filter === 'all' || r.type.toLowerCase() === filter)" :key="row.id">
        <ActionCard :type="row.type" :title="row.title" :summary="row.summary" :campaign-title="row.campaign?.title ?? null">
        <button
          type="button"
          class="mt-6 w-full rounded-xl bg-bff-deep px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#074e70] sm:w-auto"
          :disabled="submitting === row.id"
          @click="submitAction(row)"
        >
          {{ submitting === row.id ? 'Submitting…' : 'Take this action' }}
        </button>
        </ActionCard>
      </li>
    </ul>
  </SectionPanel>
</template>
