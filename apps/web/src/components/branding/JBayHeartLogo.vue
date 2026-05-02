<script setup lang="ts">
const props = defineProps<{ size?: number }>()
const size = props.size ?? 56
</script>

<template>
  <img
    src="/Logo.png"
    alt="Jeffreys Bay Blue Flag Foundation"
    :width="size"
    :height="size"
    class="flex-shrink-0 object-contain drop-shadow-wave"
  />
</template>
