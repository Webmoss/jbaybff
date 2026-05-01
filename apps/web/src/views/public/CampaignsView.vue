<script setup lang="ts">
import { ref } from 'vue'
import { useHead } from '@unhead/vue'
import { api } from '@/services/api'
import { mediaUrl } from '@/config/http'
import { RouterLink } from 'vue-router'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import HeroBanner from '@/components/ui/HeroBanner.vue'
import CampaignSpotlight from '@/components/ui/CampaignSpotlight.vue'

useHead({ title: 'Campaigns · Jeffreys Bay Blue Flag' })

interface Row {
  id: string
  title: string
  slug: string
  description: string
  imageUrl: string | null
  sponsors: { sponsor: { companyName: string } }[]
}

const list = ref<Row[]>([])
const activeFilter = ref<'all' | 'sponsor'>('all')

;(async () => {
  try {
    const res = await api.get<Row[]>('/campaigns/public')
    list.value = res.data
  } catch {
    list.value = []
  }
})()
</script>

<template>
  <SectionPanel tone="white">
    <HeroBanner
      kicker="Campaigns"
      title="Campaigns to protect waves, beaches, and coastal communities."
      subtitle="Explore active stewardship campaigns and contribute where your support matters most."
    >
      <div class="mt-7 grid w-full gap-3 sm:inline-flex sm:w-auto sm:flex-wrap">
        <button class="bff-button-secondary w-full justify-center sm:w-auto sm:justify-start" :class="activeFilter === 'all' ? '!bg-bff-deep !text-white' : ''" @click="activeFilter = 'all'">All campaigns</button>
        <button class="bff-button-secondary w-full justify-center sm:w-auto sm:justify-start" :class="activeFilter === 'sponsor' ? '!bg-bff-deep !text-white' : ''" @click="activeFilter = 'sponsor'">With sponsors</button>
      </div>
    </HeroBanner>
  </SectionPanel>

  <SectionPanel tone="sand">
    <div v-if="list[0]" class="mb-10">
      <CampaignSpotlight :title="list[0].title" :slug="list[0].slug" :description="list[0].description" :image-url="list[0].imageUrl" />
    </div>
    <div class="grid gap-8 md:grid-cols-2">
      <article
        v-for="c in list.filter((_row, idx) => idx > 0).filter((row) => activeFilter === 'all' || row.sponsors.length > 0)"
        :key="c.id"
        class="bff-card flex flex-col overflow-hidden"
      >
        <div class="aspect-[16/11] bg-bff-sand">
          <img v-if="c.imageUrl" class="h-full w-full object-cover" :src="mediaUrl(c.imageUrl)" loading="lazy" :alt="'Cover ' + c.title" />
        </div>
        <div class="flex flex-1 flex-col px-8 py-8">
          <h2 class="font-display text-2xl">{{ c.title }}</h2>
          <p class="mt-4 whitespace-pre-wrap text-bff-blue-grey">{{ c.description }}</p>
          <p class="mt-4 text-xs uppercase tracking-[0.18em] text-bff-blue-grey/82">
            Allies:
            {{ [...c.sponsors].map((s) => s.sponsor.companyName).join(', ') || 'Community coalition' }}
          </p>
          <RouterLink class="mt-6 font-semibold text-bff-deep hover:text-bff-coral" :to="{ name: 'campaign-detail', params: { slug: c.slug } }">
            View campaign →
          </RouterLink>
        </div>
      </article>
    </div>
  </SectionPanel>
</template>
