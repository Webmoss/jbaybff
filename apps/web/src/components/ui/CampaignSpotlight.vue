<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { mediaUrl } from '@/config/http'

defineProps<{
  title: string
  slug: string
  description?: string
  imageUrl?: string | null
  ctaLabel?: string
}>()
</script>

<template>
  <article class="bff-card overflow-hidden">
    <div class="aspect-[16/9] bg-bff-sand">
      <img v-if="imageUrl" :src="mediaUrl(imageUrl)" :alt="title" class="h-full w-full object-cover" loading="lazy" />
    </div>
    <div class="p-6 sm:p-7">
      <h3 class="font-display text-2xl sm:text-3xl">{{ title }}</h3>
      <p v-if="description" class="mt-4 text-bff-blue-grey">{{ description }}</p>
      <RouterLink class="mt-6 inline-flex font-semibold text-bff-deep hover:text-bff-coral" :to="{ name: 'campaign-detail', params: { slug } }">
        {{ ctaLabel || 'View campaign' }} →
      </RouterLink>
    </div>
  </article>
</template>
