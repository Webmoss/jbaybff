<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
const links = (
  [
    ['admin-home', '', 'Overview'],
    ['admin-users', 'users', 'Users'],
    ['admin-sponsors', 'sponsors', 'Sponsors'],
    ['admin-campaigns', 'campaigns', 'Campaigns'],
    ['admin-blog', 'blog', 'Blog CMS'],
    ['admin-media', 'media', 'Media'],
    ['admin-actions', 'actions', 'Actions'],
    ['admin-events', 'events', 'Events'],
    ['admin-partnerships', 'partnerships', 'Partnerships'],
    ['admin-retention', 'retention', 'Retention'],
    ['admin-impact', 'impact', 'Impact'],
    ['admin-shop', 'shop', 'Shop'],
  ] as const
).map(([name, path, label]) => ({ name, path, label }))
</script>

<template>
  <div class="min-h-screen bg-bff-deep selection:bg-white/35">
    <div class="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[258px,minmax(0,1fr)]">
      <aside class="sticky top-0 hidden h-screen bg-bff-deep lg:flex lg:flex-col lg:border-r lg:border-white/10">
        <div class="flex flex-col gap-1 px-6 py-10">
          <p class="text-xs uppercase tracking-[0.3em] text-bff-aqua/80">JBay · Admin</p>
          <RouterLink to="/admin" class="font-display text-2xl leading-tight text-white">Control room</RouterLink>
          <RouterLink class="mt-6 text-xs text-white/65 hover:text-white" to="/">&larr; Public site</RouterLink>
          <RouterLink class="block text-xs text-white/65 hover:text-white" to="/dashboard">Donor preview</RouterLink>

          <nav class="mt-10 space-y-1 text-[15px] font-medium tracking-tight" aria-label="Admin">
            <RouterLink
              v-for="l in links"
              :key="l.name"
              :to="{ name: l.name }"
              class="flex rounded-xl px-3 py-2 text-white/75 transition hover:bg-white/10 hover:text-white"
              active-class="!bg-white/16 !font-semibold !text-white"
            >
              {{ l.label }}
            </RouterLink>
          </nav>
        </div>
      </aside>

      <div class="min-h-screen bg-stone-100 px-5 py-12 sm:px-10 lg:rounded-tl-[42px]">
        <RouterView />
      </div>
    </div>
  </div>
</template>
