<script setup lang="ts">
defineProps<{
  type: string
  title: string
  summary?: string | null
  campaignTitle?: string | null
}>()
</script>

<template>
  <article class="bff-card px-7 py-6">
    <p class="bff-kicker">{{ type }}</p>
    <h3 class="mt-3 font-display text-2xl">{{ title }}</h3>
    <p v-if="summary" class="mt-3 text-bff-blue-grey">{{ summary }}</p>
    <p v-if="campaignTitle" class="mt-3 text-sm text-bff-deep/70">Linked campaign: {{ campaignTitle }}</p>
    <slot />
  </article>
</template>
