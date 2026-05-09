<script setup lang="ts">
const props = defineProps<{ size?: number; alt?: string }>()
const size = props.size ?? 56
const alt = props.alt ?? 'Jeffreys Bay Blue Flag Foundation'
</script>

<template>
  <img
    src="/Logo.png"
    :alt="alt"
    :width="size"
    :height="size"
    class="flex-shrink-0 object-contain drop-shadow-wave"
  />
</template>
