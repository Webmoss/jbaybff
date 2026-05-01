<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/services/api'
import { trackEvent } from '@/services/kpi'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import HeroBanner from '@/components/ui/HeroBanner.vue'
import EventCard from '@/components/ui/EventCard.vue'

type EventRow = {
  id: string
  title: string
  slug: string
  location: string
  startsAt: string
  _count?: { rsvps: number }
}

const events = ref<EventRow[]>([])
const email = ref('')
const name = ref('')
const busy = ref<string | null>(null)

onMounted(async () => {
  const res = await api.get<EventRow[]>('/events/public')
  events.value = res.data
})

async function rsvp(e: EventRow) {
  if (!email.value || !name.value) return
  busy.value = e.id
  try {
    await api.post(`/events/public/${encodeURIComponent(e.id)}/rsvp`, {
      email: email.value,
      name: name.value,
    })
    trackEvent('event_rsvp_created', { eventSlug: e.slug })
    e._count = { rsvps: (e._count?.rsvps || 0) + 1 }
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <SectionPanel tone="white">
    <HeroBanner
      kicker="Events"
      title="Join events near you"
      subtitle="Register for cleanups, awareness sessions, and community events across Jeffreys Bay."
    />
  </SectionPanel>

  <SectionPanel tone="sand">
    <div class="mt-8 grid gap-4 sm:grid-cols-2">
      <label class="grid gap-1.5 text-sm font-medium text-bff-deep/85">
        Email for RSVP
        <input v-model="email" type="email" placeholder="you@example.com" class="rounded-xl border px-4 py-3" />
      </label>
      <label class="grid gap-1.5 text-sm font-medium text-bff-deep/85">
        Your name
        <input v-model="name" type="text" placeholder="First and last name" class="rounded-xl border px-4 py-3" />
      </label>
    </div>

    <ul class="mt-10 grid gap-5">
      <li
        v-for="row in events"
        :key="row.id"
      >
        <EventCard
          :title="row.title"
          :when="new Date(row.startsAt).toLocaleString()"
          :location="row.location"
          :rsvps="row._count?.rsvps ?? 0"
        >
        <button
          type="button"
          class="mt-5 w-full rounded-xl bg-bff-deep px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#074e70] sm:w-auto"
          :disabled="busy === row.id || !email || !name"
          @click="rsvp(row)"
        >
          {{ busy === row.id ? 'Sending…' : 'RSVP now' }}
        </button>
        </EventCard>
      </li>
    </ul>
  </SectionPanel>
</template>
