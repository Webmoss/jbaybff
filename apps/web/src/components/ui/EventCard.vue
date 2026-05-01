<script setup lang="ts">
defineProps<{
  title: string
  when: string
  location: string
  chapter?: string | null
  rsvps?: number
}>()
</script>

<template>
  <article class="bff-card px-7 py-6">
    <h3 class="font-display text-2xl">{{ title }}</h3>
    <p class="mt-3 text-bff-blue-grey">{{ location }} · {{ when }}</p>
    <p v-if="chapter" class="mt-2 text-sm text-bff-deep/70">Hosted by {{ chapter }}</p>
    <p class="mt-2 text-sm text-bff-deep/70">RSVPs: {{ rsvps ?? 0 }}</p>
    <slot />
  </article>
</template>
