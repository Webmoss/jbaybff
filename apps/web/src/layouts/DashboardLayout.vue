<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-stone-100">
    <div class="relative mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[240px,minmax(0,1fr)]">
      <aside class="sticky top-0 hidden h-screen border-r border-white/70 bg-white/90 p-8 shadow-wave backdrop-blur lg:flex lg:flex-col">
        <RouterLink to="/dashboard" class="font-display text-lg text-bff-deep">
          Giving Hub
        </RouterLink>

        <nav class="mt-10 space-y-1 text-sm font-medium text-bff-blue-grey">
          <RouterLink
            exact-active-class="font-semibold text-bff-deep"
            class="flex rounded-xl px-3 py-2 hover:bg-bff-sand"
            :to="{ name: 'dashboard' }"
          >
            Overview
          </RouterLink>
        </nav>

        <div class="mt-auto space-y-2">
          <RouterLink class="flex rounded-xl px-3 py-2 hover:bg-bff-sand/80" to="/">« View site</RouterLink>
        </div>
      </aside>

      <div class="px-6 py-10 lg:py-14">
        <RouterView />
      </div>
    </div>
  </div>
</template>
