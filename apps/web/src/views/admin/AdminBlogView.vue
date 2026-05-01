<script setup lang="ts">
import { computed, ref } from 'vue'
import { api } from '@/services/api'
import RichTextEditor from '@/components/editor/RichTextEditor.vue'

type Category = { id: string; name: string }
type Post = {
  id: string
  title: string
  slug: string
  published: boolean
  excerpt: string | null
  content?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  category?: { id: string } | null
}

const rows = ref<Post[]>([])
const cats = ref<Category[]>([])
const activeId = ref<string | null>(null)

const composer = ref({
  title: 'Coastal stewardship note',
  excerpt: '',
  metaTitle: '',
  metaDescription: '',
  html: '<p>Add depth.</p>',
  categoryId: '' as string,
  published: false,
})

const activePost = computed(() => rows.value.find((p) => p.id === activeId.value))

async function loadAll() {
  cats.value = (await api.get<Category[]>('/blog/public/categories')).data
  rows.value = (await api.get<Post[]>('/blog/admin/posts')).data
}

void loadAll()

function pick(p: Post) {
  activeId.value = p.id
  composer.value = {
    title: p.title,
    excerpt: p.excerpt ?? '',
    metaTitle: p.metaTitle ?? '',
    metaDescription: p.metaDescription ?? '',
    html: p.content ?? '<p></p>',
    categoryId: p.category?.id ?? '',
    published: p.published,
  }
}

function blank() {
  activeId.value = null
  composer.value = {
    title: 'Coastal stewardship note',
    excerpt: '',
    metaTitle: '',
    metaDescription: '',
    html: '<p>Add depth.</p>',
    categoryId: '',
    published: false,
  }
}

async function save() {
  const body = {
    title: composer.value.title,
    excerpt: composer.value.excerpt || undefined,
    content: composer.value.html,
    published: composer.value.published,
    metaTitle: composer.value.metaTitle || undefined,
    metaDescription: composer.value.metaDescription || undefined,
    categoryId: composer.value.categoryId || undefined,
  }

  if (activeId.value) {
    await api.patch(`/blog/admin/posts/${encodeURIComponent(activeId.value)}`, body)
  } else {
    await api.post('/blog/admin/posts', body)
  }

  await loadAll()
}
</script>

<template>
  <div class="grid gap-12 lg:grid-cols-[minmax(260px,_0.95fr)_minmax(0,_1fr)]">
    <div>
      <h1 class="font-display text-3xl">Blog CMS</h1>
      <p class="mt-3 text-sm text-bff-deep/70">
        {{ activePost ? `Editing: ${activePost.slug}` : 'New draft' }}
      </p>

      <button type="button" class="mt-6 rounded-xl border border-black/15 px-5 py-2 text-sm font-semibold hover:bg-white" @click="blank">
        New blank draft
      </button>

      <ul class="mt-6 space-y-3">
        <li v-for="p in rows" :key="p.id">
          <button
            type="button"
            class="w-full rounded-2xl border px-5 py-4 text-left transition hover:border-bff-aqua"
            :class="p.id === activeId ? 'border-bff-deep bg-white shadow-sm' : 'border-black/10'"
            @click="pick(p)"
          >
            <div class="font-semibold">{{ p.title }}</div>
            <div class="mt-1 text-xs text-bff-blue-grey">{{ p.published ? 'Published' : 'Draft' }} · {{ p.slug }}</div>
          </button>
        </li>
      </ul>
    </div>

    <div class="space-y-7">
      <label class="block text-xs font-semibold uppercase tracking-widest text-bff-deep/60"> Title </label>
      <input v-model="composer.title" class="w-full rounded-xl border px-4 py-3" />

      <label class="block text-xs font-semibold uppercase tracking-widest text-bff-deep/60"> Excerpt </label>
      <textarea v-model="composer.excerpt" rows="3" class="w-full rounded-xl border px-4 py-3" />

      <label class="block text-xs font-semibold uppercase tracking-widest text-bff-deep/60"> Meta title </label>
      <input v-model="composer.metaTitle" class="w-full rounded-xl border px-4 py-3" />

      <label class="block text-xs font-semibold uppercase tracking-widest text-bff-deep/60"> Meta description </label>
      <textarea v-model="composer.metaDescription" rows="2" class="w-full rounded-xl border px-4 py-3" />

      <label class="block text-xs font-semibold uppercase tracking-widest text-bff-deep/60"> Category </label>
      <select v-model="composer.categoryId" class="w-full rounded-xl border px-4 py-3">
        <option value="">Unassigned</option>
        <option v-for="c in cats" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>

      <label class="flex items-center gap-3 text-sm font-semibold">
        <input v-model="composer.published" type="checkbox" class="size-5 accent-bff-deep" />
        Published publicly
      </label>

      <RichTextEditor v-model="composer.html" />

      <button type="button" class="rounded-xl bg-bff-deep px-10 py-3 font-semibold text-white hover:bg-[#074e70]" @click="save">
        Save draft or updates
      </button>
    </div>
  </div>
</template>
