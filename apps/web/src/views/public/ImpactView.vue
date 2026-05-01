<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/services/api'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import HeroBanner from '@/components/ui/HeroBanner.vue'
import ImpactCounterGrid from '@/components/ui/ImpactCounterGrid.vue'

type Impact = {
  activeCampaigns: number
  activeActions: number
  publishedEvents: number
  completedDonations: number
  volunteerCheckIns: number
  totalRaised: string | number
  currency: string
}

const impact = ref<Impact | null>(null)

onMounted(async () => {
  impact.value = (await api.get<Impact>('/impact/public/summary')).data
})
</script>

<template>
  <SectionPanel tone="white">
    <HeroBanner
      kicker="Impact"
      title="Our efforts are paying off"
      subtitle="Transparent progress across campaigns, actions, donations, and volunteer participation."
    />
  </SectionPanel>

  <SectionPanel tone="sand">
    <div v-if="impact" class="space-y-8">
      <ImpactCounterGrid
        :items="[
          { label: 'Total raised', value: `${impact.currency} ${impact.totalRaised}` },
          { label: 'Campaigns', value: impact.activeCampaigns },
          { label: 'Actions', value: impact.activeActions },
          { label: 'Events', value: impact.publishedEvents },
          { label: 'Donations', value: impact.completedDonations },
          { label: 'Volunteer check-ins', value: impact.volunteerCheckIns },
        ]"
      />
      <div class="bff-card px-7 py-6">
        <p class="bff-kicker">What this means</p>
        <p class="mt-3 text-bff-blue-grey">
          These numbers represent local movement capacity: community action, recurring support, and attendance momentum
          that strengthens long-term Blue Flag outcomes.
        </p>
      </div>
    </div>
  </SectionPanel>
</template>
