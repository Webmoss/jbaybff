<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppSiteHeader from '@/components/nav/AppSiteHeader.vue'
import AppSiteFooter from '@/components/nav/AppSiteFooter.vue'
</script>

<template>
  <div class="relative flex min-h-screen flex-col">
    <AppSiteHeader />

    <div class="bff-hero-swoosh pointer-events-none absolute inset-x-0 top-28 z-0 h-[320px]" aria-hidden="true" />

    <main id="main-content" tabindex="-1" class="relative z-10 flex-1">
      <RouterView />
    </main>

    <AppSiteFooter />
  </div>
</template>
