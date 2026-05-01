<template>
  <section class="bff-section relative overflow-hidden" :class="toneClass">
    <div v-if="$slots.decor" class="pointer-events-none absolute inset-0">
      <slot name="decor" />
    </div>
    <div class="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
      <slot />
    </div>
    <WaveBand v-if="wave" class="absolute bottom-0 left-0 right-0" />
  </section>
</template>

<script setup lang="ts">
import WaveBand from '@/components/ui/WaveBand.vue'

const props = defineProps<{ tone?: 'sand' | 'deep' | 'aqua' | 'white'; wave?: boolean }>()
const wave = props.wave ?? false
const toneClass =
  props.tone === 'deep' ?
    'bg-bff-deep text-bff-sand'
  : props.tone === 'white' ?
    'bg-white text-bff-deep'
  : props.tone === 'aqua' ?
    'bg-linear-to-br from-white via-white to-bff-aqua/15 text-bff-deep'
  : 'bg-linear-to-br from-[#dfd6c9]/95 to-[#dfd6c9]/65 text-bff-deep'
</script>
