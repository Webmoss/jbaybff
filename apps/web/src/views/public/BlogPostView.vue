<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useHead } from '@unhead/vue'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import { api } from '@/services/api'

interface Detail {
  title: string
  slug: string
  excerpt: string | null
  content: string
  metaTitle?: string | null
  metaDescription?: string | null
  category?: { name: string | null }
}

const route = useRoute()
const post = ref<Detail | null>(null)
const missing = ref(false)
const loading = ref(true)

async function load(slug: string) {
  loading.value = true
  missing.value = false
  try {
    post.value = (await api.get<Detail>(`/blog/public/posts/${encodeURIComponent(slug)}`)).data
    useHead({
      title: post.value.metaTitle ?? post.value.title ?? 'Journal',
      meta: [
        ...(post.value.metaDescription ? [{ name: 'description', content: post.value.metaDescription }] : []),
      ],
    })
  } catch {
    missing.value = true
  } finally {
    loading.value = false
  }
}

watch(() => route.params.slug, (s) => void load(String(s)), { immediate: true })
</script>

<template>
  <SectionPanel tone="sand" v-if="post">
    <header class="text-xs uppercase tracking-[0.24em] text-bff-blue-grey">{{ post.category?.name ?? 'Stories' }}</header>
    <h1 class="mt-10 font-display text-[2.6rem] text-bff-deep">{{ post.title }}</h1>
    <p v-if="post.excerpt" class="mt-8 text-xl text-bff-blue-grey/95">{{ post.excerpt }}</p>
    <article class="bff-prose mt-14 max-w-none" v-html="post.content" />
    <RouterLink class="mt-24 inline-flex font-semibold text-bff-deep hover:text-bff-coral" :to="{ name: 'blog' }">
      ← Stories index
    </RouterLink>
  </SectionPanel>
  <p v-else-if="missing && !loading" class="mx-auto max-w-xl py-24 text-center text-bff-blue-grey">Post not published yet.</p>
  <p v-else-if="loading" class="py-24 text-center">Loading…</p>
</template>

<style scoped>
:deep(.bff-prose > p) {
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 1.5rem;
  max-width: 48rem;
  font-size: 1.065rem;
  line-height: 1.72;
  color: rgb(19 120 142 / 0.96);
}

:deep(.bff-prose h2) {
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 2rem;
  margin-top: 6rem;
  max-width: 48rem;
  font-family: var(--font-display), ui-serif, Georgia, serif;
  font-size: 1.875rem;
  letter-spacing: -0.025em;
  color: rgb(2 55 80);
}

:deep(.bff-prose ul) {
  margin: 2rem auto;
  padding-left: 1.75rem;
  max-width: 48rem;
  list-style-type: disc;
}
</style>
