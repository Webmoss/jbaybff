<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/services/api'
import { mediaUrl } from '@/config/http'

const fileUrl = ref('')
const uploading = ref(false)
const msg = ref('')

async function onFile(ev: Event) {
  const inp = ev.target as HTMLInputElement
  const f = inp.files?.[0]
  if (!f) return
  uploading.value = true
  msg.value = ''
  try {
    const fd = new FormData()
    fd.append('file', f)
    const res = await api.post<{ url: string }>('/uploads/media', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    fileUrl.value = res.data.url
    msg.value = `Saved as ${mediaUrl(res.data.url)}`
  } catch {
    msg.value = 'Upload failed — login as ADMIN and retry.'
  } finally {
    uploading.value = false
    inp.value = ''
  }
}
</script>

<template>
  <div class="max-w-xl space-y-10">
    <header>
      <h1 class="font-display text-3xl">Media uploads</h1>
      <p class="text-[15px] text-bff-deep/70">
        Files land under <code>apps/api/uploads/public</code> and are reachable at <code>/uploads/…</code> on the API host.
      </p>
    </header>

    <label
      class="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-black/25 bg-white px-8 py-16 text-center text-sm hover:border-bff-aqua transition"
    >
      <span class="font-semibold text-bff-deep">Choose image · JPG / PNG / WEBP / SVG / GIF</span>
      <input type="file" accept="image/*" class="sr-only" :disabled="uploading" @change="onFile" />
    </label>

    <p v-if="uploading">Uploading…</p>

    <p v-if="msg" class="text-sm text-bff-blue-grey">{{ msg }}</p>

    <div v-if="fileUrl">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-bff-deep/60">Absolute URL preview</p>
      <img v-if="fileUrl.endsWith('.svg') || /\.(png|jpe?g|gif|webp)$/i.test(fileUrl)" class="mt-4 max-h-48 rounded-2xl object-contain" :src="mediaUrl(fileUrl)" alt="Uploaded preview" />
      <pre class="mt-4 whitespace-pre-wrap break-all rounded-xl bg-black/5 px-5 py-4 text-xs">{{ mediaUrl(fileUrl) }}</pre>
    </div>
  </div>
</template>
