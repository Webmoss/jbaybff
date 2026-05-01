<script setup lang="ts">
defineProps<{
  kicker?: string
  title: string
  subtitle?: string
}>()
</script>

<template>
  <section class="relative overflow-hidden rounded-[2rem] border border-black/[0.08] bg-white p-8 shadow-wave sm:p-10 lg:p-14">
    <div class="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-bff-aqua/25 to-transparent" aria-hidden="true" />
    <p v-if="kicker" class="bff-kicker">{{ kicker }}</p>
    <h1 class="bff-h1 mt-3 max-w-4xl">{{ title }}</h1>
    <p v-if="subtitle" class="mt-5 max-w-3xl text-[1.08rem] leading-relaxed text-bff-blue-grey">{{ subtitle }}</p>
    <slot />
  </section>
</template>
