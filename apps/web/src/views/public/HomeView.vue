<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useHead } from '@unhead/vue'
import { api } from '@/services/api'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import HeroBanner from '@/components/ui/HeroBanner.vue'
import CampaignSpotlight from '@/components/ui/CampaignSpotlight.vue'
import MetricStrip from '@/components/ui/MetricStrip.vue'
import ImpactCounterGrid from '@/components/ui/ImpactCounterGrid.vue'

useHead({ title: 'Home · Jeffreys Bay Blue Flag' })

type CampaignLite = { id: string; title: string; slug: string; description?: string; featured?: boolean; imageUrl?: string | null }
type PostLite = { slug: string; title: string; excerpt?: string | null; category?: { name?: string | null } }
type SponsorRow = { id: string; companyName: string }
type Impact = { activeCampaigns: number; activeActions: number; publishedEvents: number; completedDonations: number; volunteerCheckIns: number; totalRaised: string | number; currency: string }
type EventRow = { id: string; title: string; startsAt: string }

const campaigns = ref<CampaignLite[]>([])
const posts = ref<PostLite[]>([])
const sponsors = ref<SponsorRow[]>([])
const impact = ref<Impact | null>(null)
const events = ref<EventRow[]>([])

const heroCampaign = computed(() => campaigns.value.find((c) => c.featured) || campaigns.value[0] || null)
const metrics = computed(() => {
  if (!impact.value) return []
  return [
    { label: 'Active campaigns', value: impact.value.activeCampaigns },
    { label: 'Actions live', value: impact.value.activeActions },
    { label: 'Events published', value: impact.value.publishedEvents },
  ]
})

onMounted(async () => {
  const [cRes, pRes, sRes, iRes, eRes] = await Promise.all([
    api.get<CampaignLite[]>('/campaigns/public'),
    api.get<PostLite[]>('/blog/public/posts'),
    api.get<SponsorRow[]>('/sponsors/public'),
    api.get<Impact>('/impact/public/summary'),
    api.get<EventRow[]>('/events/public'),
  ])
  campaigns.value = cRes.data
  posts.value = pRes.data.slice(0, 3)
  sponsors.value = sRes.data
  impact.value = iRes.data
  events.value = eRes.data.slice(0, 3)
})
</script>

<template>
  <div class="space-y-0">
    <SectionPanel tone="white">
      <HeroBanner
        kicker="Urgent campaign"
        title="Your voice matters — defend and restore Jeffreys Bay’s shoreline."
        subtitle="Join active coastal campaigns, local action, and volunteer events that keep beaches clean, accessible, and thriving."
      >
        <div class="mt-8 grid w-full gap-3 sm:inline-flex sm:w-auto sm:grid-cols-none sm:flex-wrap">
          <RouterLink class="bff-button-primary w-full justify-center sm:w-auto sm:justify-start" to="/actions">Take Action</RouterLink>
          <RouterLink class="bff-button-secondary w-full justify-center sm:w-auto sm:justify-start" to="/campaigns">View Campaigns</RouterLink>
          <RouterLink class="bff-button-secondary w-full justify-center sm:w-auto sm:justify-start" to="/programs">Explore Programs</RouterLink>
        </div>
        <div v-if="heroCampaign" class="mt-10">
          <CampaignSpotlight
            :title="heroCampaign.title"
            :slug="heroCampaign.slug"
            :description="heroCampaign.description"
            :image-url="heroCampaign.imageUrl"
            cta-label="Explore featured campaign"
          />
        </div>
      </HeroBanner>
    </SectionPanel>

    <SectionPanel tone="sand">
      <p class="bff-kicker">What we fight for</p>
      <h2 class="bff-h2 mt-2">Mission priorities</h2>
      <div class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article v-for="item in ['Plastic reduction', 'Ocean protection', 'Beach access', 'Coast & climate', 'Clean water']" :key="item" class="bff-card px-5 py-6">
          <h3 class="font-semibold">{{ item }}</h3>
          <p class="mt-2 text-sm text-bff-blue-grey">Local action and policy advocacy for Jeffreys Bay.</p>
        </article>
      </div>
    </SectionPanel>

    <SectionPanel tone="white">
      <div class="grid gap-10 lg:grid-cols-[1.15fr,0.85fr]">
        <div>
          <p class="bff-kicker">Latest updates</p>
          <h2 class="bff-h2 mt-2">Field notes and stories</h2>
          <RouterLink class="mt-4 inline-flex font-semibold text-bff-deep hover:text-bff-coral" to="/blog">View all news →</RouterLink>
        </div>
        <div class="space-y-4">
          <article v-for="p in posts" :key="p.slug" class="bff-card px-6 py-5">
            <p class="bff-kicker">{{ p.category?.name || 'News' }}</p>
            <h3 class="mt-2 font-display text-2xl">{{ p.title }}</h3>
            <RouterLink class="mt-3 inline-flex font-semibold text-bff-deep hover:text-bff-coral" :to="{ name: 'blog-post', params: { slug: p.slug } }">Read update →</RouterLink>
          </article>
        </div>
      </div>
    </SectionPanel>

    <SectionPanel tone="aqua">
      <p class="bff-kicker">Get involved near you</p>
      <h2 class="bff-h2 mt-2">Join upcoming events</h2>
      <div class="mt-8 bff-card px-6 py-6">
        <ul class="mt-2 space-y-3">
          <li v-for="e in events" :key="e.id" class="rounded-2xl bg-bff-sand/45 px-4 py-3">
            <p class="font-semibold">{{ e.title }}</p>
            <p class="text-sm text-bff-blue-grey">{{ new Date(e.startsAt).toLocaleString() }}</p>
          </li>
        </ul>
        <RouterLink class="mt-5 inline-flex font-semibold text-bff-deep hover:text-bff-coral" to="/events">All events →</RouterLink>
      </div>
    </SectionPanel>

    <SectionPanel tone="white">
      <p class="bff-kicker">Our impact</p>
      <h2 class="bff-h2 mt-2">Our efforts are paying off</h2>
      <div v-if="impact" class="mt-8">
        <MetricStrip :metrics="metrics" />
        <div class="mt-6">
          <ImpactCounterGrid
            :items="[
              { label: 'Total raised', value: `${impact.currency} ${impact.totalRaised}` },
              { label: 'Completed donations', value: impact.completedDonations },
              { label: 'Volunteer check-ins', value: impact.volunteerCheckIns },
            ]"
          />
        </div>
      </div>
    </SectionPanel>

    <SectionPanel tone="deep">
      <p class="bff-kicker text-bff-aqua">Partners and support</p>
      <h2 class="bff-h2 mt-2 text-balance text-white">Our network keeps this movement alive</h2>
      <div class="mt-8 flex flex-wrap gap-3">
        <span v-for="s in sponsors.slice(0, 10)" :key="s.id" class="rounded-full border border-white/20 px-4 py-2 text-sm text-white/90">{{ s.companyName }}</span>
      </div>
      <div class="mt-10 flex flex-wrap gap-3">
        <RouterLink class="bff-button-primary" to="/dashboard">Start membership</RouterLink>
        <RouterLink class="rounded-full border border-white/35 px-6 py-3 font-semibold text-white hover:bg-white/10" to="/campaigns">Donate monthly</RouterLink>
        <RouterLink class="rounded-full border border-white/35 px-6 py-3 font-semibold text-white hover:bg-white/10" to="/actions">Support a campaign</RouterLink>
        <RouterLink class="rounded-full border border-white/35 px-6 py-3 font-semibold text-white hover:bg-white/10" to="/partnerships">Become a partner</RouterLink>
      </div>
      <div class="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article class="rounded-2xl border border-white/20 bg-white/5 px-4 py-5 sm:px-5">
          <p class="text-xs uppercase tracking-[0.18em] text-bff-aqua">Starter</p>
          <p class="mt-2 font-display text-3xl">R100</p>
          <p class="mt-2 text-sm text-white/80">Supports monthly cleanup supplies.</p>
        </article>
        <article class="rounded-2xl border border-white/20 bg-white/5 px-4 py-5 sm:px-5">
          <p class="text-xs uppercase tracking-[0.18em] text-bff-aqua">Steward</p>
          <p class="mt-2 font-display text-3xl">R200</p>
          <p class="mt-2 text-sm text-white/80">Funds volunteer activation and event kits.</p>
        </article>
        <article class="rounded-2xl border border-white/20 bg-white/5 px-4 py-5 sm:px-5">
          <p class="text-xs uppercase tracking-[0.18em] text-bff-aqua">Guardian</p>
          <p class="mt-2 font-display text-3xl">R500</p>
          <p class="mt-2 text-sm text-white/80">Backs education + campaign execution.</p>
        </article>
        <article class="rounded-2xl border border-white/20 bg-white/5 px-4 py-5 sm:px-5">
          <p class="text-xs uppercase tracking-[0.18em] text-bff-aqua">Champion</p>
          <p class="mt-2 font-display text-3xl">R1000</p>
          <p class="mt-2 text-sm text-white/80">Powers flagship projects and rapid response work.</p>
        </article>
      </div>
    </SectionPanel>
  </div>
</template>
