<script setup lang="ts">
import { useHead } from '@unhead/vue'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import { api } from '@/services/api'
import { RouterLink } from 'vue-router'
import { ref } from 'vue'

useHead({ title: 'Stories · Jeffreys Bay Blue Flag' })

interface Post {
  slug: string
  title: string
  excerpt: string | null
  category?: { name: string } | null
}

const rows = ref<Post[]>([])

;(async () => {
  const res = await api.get<Post[]>('/blog/public/posts')
  rows.value = res.data
})().catch(() => {
  rows.value = []
})
</script>

<template>
  <SectionPanel tone="sand">
    <h1 class="font-display text-[2.65rem]">Coastal notebooks</h1>
    <p class="mt-4 max-w-2xl text-bff-blue-grey">Draft / publish workflows live behind the secured admin composer.</p>
    <div class="mt-12 grid gap-8 md:grid-cols-[repeat(auto-fill,minmax(300px,_1fr))]">
      <article v-for="p in rows" :key="p.slug" class="rounded-[26px] border border-black/[0.05] bg-white p-11 shadow-wave">
        <header class="text-xs uppercase tracking-[0.22em] text-bff-blue-grey">{{ p.category?.name ?? 'Stories' }}</header>
        <h2 class="mt-9 font-display text-[1.6rem] text-bff-deep">{{ p.title }}</h2>
        <p v-if="p.excerpt" class="mt-6 text-[15px] leading-relaxed text-bff-blue-grey">{{ p.excerpt }}</p>
        <RouterLink class="mt-11 inline-flex font-semibold text-bff-deep hover:text-bff-coral" :to="{ name: 'blog-post', params: { slug: p.slug } }">
          Read —
        </RouterLink>
      </article>
    </div>
  </SectionPanel>
</template>
