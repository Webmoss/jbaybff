<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { RouterLink } from 'vue-router'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import HeroBanner from '@/components/ui/HeroBanner.vue'

useHead({ title: 'Programs · Jeffreys Bay Blue Flag' })

const programs = [
  {
    title: 'Plastic Reduction',
    blurb: 'Beach and neighborhood interventions to reduce single-use plastics and litter hotspots.',
  },
  {
    title: 'Ocean Protection',
    blurb: 'Campaigns and partnerships that protect marine biodiversity and surf ecosystems.',
  },
  {
    title: 'Beach Access',
    blurb: 'Protecting fair, safe, and inclusive access to Jeffreys Bay shoreline spaces.',
  },
  {
    title: 'Coasts & Climate',
    blurb: 'Nature-based solutions, dune resilience, and long-horizon adaptation actions.',
  },
  {
    title: 'Clean Water',
    blurb: 'Community monitoring, education, and advocacy around water quality outcomes.',
  },
  {
    title: 'Youth Stewardship',
    blurb: 'Learner engagement and local leadership pipelines for long-term coastal care.',
  },
]
</script>

<template>
  <SectionPanel tone="white">
    <HeroBanner
      kicker="Programs"
      title="Program pillars that guide our coastline work."
      subtitle="Campaigns and events connect to these long-term stewardship programs."
    />
  </SectionPanel>

  <SectionPanel tone="sand">
    <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <article v-for="program in programs" :key="program.title" class="bff-card px-6 py-6">
        <h2 class="font-display text-2xl">{{ program.title }}</h2>
        <p class="mt-3 text-bff-blue-grey">{{ program.blurb }}</p>
      </article>
    </div>
  </SectionPanel>

  <SectionPanel tone="deep">
    <div class="grid gap-6 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
      <div>
        <p class="bff-kicker text-bff-aqua">Partnership spotlight</p>
        <h2 class="bff-h2 mt-2 text-white">Back these programs through meaningful partnerships</h2>
        <p class="mt-4 max-w-2xl text-white/85">
          Corporate teams, schools, clubs, and community organizations can co-fund initiatives and volunteer events tied to measurable local outcomes.
        </p>
      </div>
      <div class="bff-card border border-white/20 bg-white/5 px-6 py-6">
        <h3 class="font-display text-2xl text-white">Partner with JBay BFF</h3>
        <p class="mt-3 text-white/80">Submit a partnership inquiry and our team will help scope the right program fit.</p>
        <RouterLink class="mt-5 inline-flex rounded-full bg-bff-coral px-6 py-3 text-sm font-semibold text-bff-deep hover:brightness-95" to="/partnerships">
          Start partnership inquiry
        </RouterLink>
      </div>
    </div>
  </SectionPanel>
</template>
