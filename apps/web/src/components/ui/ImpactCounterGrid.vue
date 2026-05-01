<script setup lang="ts">
defineProps<{ items: { label: string; value: string | number }[] }>()
</script>

<template>
  <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    <article v-for="item in items" :key="item.label" class="bff-card px-6 py-5">
      <p class="text-xs uppercase tracking-[0.2em] text-bff-blue-grey">{{ item.label }}</p>
      <p class="mt-3 font-display text-4xl">{{ item.value }}</p>
    </article>
  </div>
</template>
