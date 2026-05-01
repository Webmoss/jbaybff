<script setup lang="ts">
defineProps<{
  name: string
  zone?: string | null
  description?: string | null
  contactEmail?: string | null
  eventCount?: number
}>()
</script>

<template>
  <article class="bff-card px-7 py-6">
    <h3 class="font-display text-2xl">{{ name }}</h3>
    <p v-if="zone" class="mt-2 text-xs uppercase tracking-[0.16em] text-bff-blue-grey">{{ zone }}</p>
    <p v-if="description" class="mt-3 text-bff-blue-grey">{{ description }}</p>
    <p v-if="contactEmail" class="mt-4 text-sm">Contact: {{ contactEmail }}</p>
    <p class="mt-2 text-sm text-bff-deep/70">Upcoming events: {{ eventCount ?? 0 }}</p>
    <slot />
  </article>
</template>
