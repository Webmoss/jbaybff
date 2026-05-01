<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="max-w-xl space-y-8">
    <h1 class="font-display text-3xl">Operations control</h1>
    <p class="text-[15px] leading-relaxed text-bff-deep/74">
      Ship campaigns with SEO payloads, hydrate sponsor tiles, compose blog drafts in TipTap, and push media blobs to disk behind JWT-guarded multer uploads.
    </p>
    <nav class="grid gap-6 sm:grid-cols-[repeat(auto-fill,minmax(200px,_1fr))] pt-10">
      <RouterLink class="rounded-3xl border border-black/[0.08] bg-white p-10 shadow-wave hover:border-bff-aqua transition" :to="{ name: 'admin-campaigns' }">
        <p class="text-lg font-semibold">Campaigns</p>
        <p class="mt-5 text-[14px] text-bff-blue-grey">Funding goals + OG data</p>
      </RouterLink>
      <RouterLink class="rounded-3xl border border-black/[0.08] bg-white p-10 shadow-wave hover:border-bff-aqua transition" :to="{ name: 'admin-blog' }">
        <p class="text-lg font-semibold">Blog CMS</p>
        <p class="mt-5 text-[14px] text-bff-blue-grey">Draft ↔ publish workflows</p>
      </RouterLink>
      <RouterLink class="rounded-3xl border border-black/[0.08] bg-white p-10 shadow-wave hover:border-bff-aqua transition" :to="{ name: 'admin-media' }">
        <p class="text-lg font-semibold">Media</p>
        <p class="mt-5 text-[14px] text-bff-blue-grey">`/uploads` static serving</p>
      </RouterLink>
      <RouterLink class="rounded-3xl border border-black/[0.08] bg-white p-10 shadow-wave hover:border-bff-aqua transition" :to="{ name: 'admin-users' }">
        <p class="text-lg font-semibold">Users</p>
      </RouterLink>
      <RouterLink class="rounded-3xl border border-black/[0.08] bg-white p-10 shadow-wave hover:border-bff-aqua transition" :to="{ name: 'admin-actions' }">
        <p class="text-lg font-semibold">Action Center</p>
        <p class="mt-5 text-[14px] text-bff-blue-grey">Petitions, pledges, civic CTAs</p>
      </RouterLink>
      <RouterLink class="rounded-3xl border border-black/[0.08] bg-white p-10 shadow-wave hover:border-bff-aqua transition" :to="{ name: 'admin-events' }">
        <p class="text-lg font-semibold">Events</p>
        <p class="mt-5 text-[14px] text-bff-blue-grey">Volunteer rosters + check-ins</p>
      </RouterLink>
      <RouterLink class="rounded-3xl border border-black/[0.08] bg-white p-10 shadow-wave hover:border-bff-aqua transition" :to="{ name: 'admin-partnerships' }">
        <p class="text-lg font-semibold">Partnerships</p>
        <p class="mt-5 text-[14px] text-bff-blue-grey">Pipeline and inquiry review</p>
      </RouterLink>
      <RouterLink class="rounded-3xl border border-black/[0.08] bg-white p-10 shadow-wave hover:border-bff-aqua transition" :to="{ name: 'admin-retention' }">
        <p class="text-lg font-semibold">Retention</p>
        <p class="mt-5 text-[14px] text-bff-blue-grey">Outbox, consent, and dispatch health</p>
      </RouterLink>
      <RouterLink class="rounded-3xl border border-black/[0.08] bg-white p-10 shadow-wave hover:border-bff-aqua transition" :to="{ name: 'admin-impact' }">
        <p class="text-lg font-semibold">Impact</p>
        <p class="mt-5 text-[14px] text-bff-blue-grey">KPI and conversion analytics</p>
      </RouterLink>
      <RouterLink class="rounded-3xl border border-black/[0.08] bg-white p-10 shadow-wave hover:border-bff-aqua transition" :to="{ name: 'admin-shop' }">
        <p class="text-lg font-semibold">Shop</p>
        <p class="mt-5 text-[14px] text-bff-blue-grey">Catalog, inventory, and order fulfillment</p>
      </RouterLink>
    </nav>
  </section>
</template>
