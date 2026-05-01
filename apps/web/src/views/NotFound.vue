<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="max-w-xl space-y-5 py-36 text-center">
    <p class="text-7xl font-display text-bff-deep/28">404</p>
    <p class="text-[21px] text-bff-blue-grey">The tide swept this route away.</p>
    <RouterLink class="font-semibold underline-offset-10 hover:text-bff-coral" to="/">
      Paddle back →
    </RouterLink>
  </div>
</template>
