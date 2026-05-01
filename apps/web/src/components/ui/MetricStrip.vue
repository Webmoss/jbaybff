<script setup lang="ts">
defineProps<{ metrics: { label: string; value: string | number }[] }>()
</script>

<template>
  <div class="grid gap-3 rounded-3xl border border-black/[0.08] bg-white p-4 shadow-wave sm:grid-cols-3">
    <div v-for="item in metrics" :key="item.label" class="rounded-2xl bg-bff-sand/35 px-4 py-4 text-center">
      <p class="text-xs uppercase tracking-[0.18em] text-bff-blue-grey">{{ item.label }}</p>
      <p class="mt-2 font-display text-3xl">{{ item.value }}</p>
    </div>
  </div>
</template>
