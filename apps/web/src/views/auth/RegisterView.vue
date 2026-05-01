<script setup lang="ts">
import { computed, ref } from 'vue'
import type { UserRole } from '@/types/api'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

type RegRole = Exclude<UserRole, 'ADMIN'>
const router = useRouter()
const auth = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const role = ref<RegRole>('DONOR')
const companyName = ref('')
const companyDescription = ref('')
const website = ref('')
const err = ref('')
const submitting = ref(false)

async function submit() {
  submitting.value = true
  err.value = ''
  try {
    const body: Record<string, unknown> = {
      email: email.value.trim().toLowerCase(),
      password: password.value,
      name: name.value.trim(),
      role: role.value,
    }

    if (role.value === 'SPONSOR') {
      body.companyName = companyName.value.trim()
      body.companyDescription = companyDescription.value || undefined
      body.website = website.value.trim() || undefined
    }

    await auth.register(body)
    router.push(auth.isAdmin ? '/admin' : '/dashboard')
  } catch {
    err.value = 'Unable to register — email may exist or password policy failed.'
  } finally {
    submitting.value = false
  }
}

const sponsorMode = computed(() => role.value === 'SPONSOR')
</script>

<template>
  <h1 class="font-display text-[2rem] tracking-tight text-bff-deep">Create your portal</h1>
  <p class="mt-4 text-[14px] text-bff-blue-grey/95">Donors + sponsors onboard here; admins seeded via Prisma script.</p>

  <form class="mt-9 space-y-5" autocomplete="off" @submit.prevent="submit">
    <label class="block text-xs font-semibold uppercase tracking-[0.17em] text-bff-deep/78">
      Name <input v-model.trim="name" required class="mt-2 w-full rounded-xl border px-4 py-3" />
    </label>
    <label class="block text-xs font-semibold uppercase tracking-[0.17em] text-bff-deep/78">
      Email <input v-model.trim="email" required type="email" autocomplete="username" class="mt-2 w-full rounded-xl border px-4 py-3" />
    </label>
    <label class="block text-xs font-semibold uppercase tracking-[0.17em] text-bff-deep/78">
      Password · upper, lower & digit
      <input v-model="password" required type="password" autocomplete="new-password" class="mt-2 w-full rounded-xl border px-4 py-3" />
    </label>

    <fieldset class="rounded-xl border border-bff-deep/10 p-6">
      <legend class="px-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-bff-deep/65">Portal type</legend>
      <label class="mt-6 flex items-center gap-3 text-[15px]"><input v-model="role" type="radio" value="DONOR" class="accent-bff-deep" /> Donor</label>
      <label class="mt-3 flex items-center gap-3 text-[15px]"><input v-model="role" type="radio" value="SPONSOR" class="accent-bff-deep" /> Sponsor org</label>
    </fieldset>

    <template v-if="sponsorMode">
      <label class="block text-xs font-semibold uppercase tracking-[0.17em]"
        >Company name<input v-model.trim="companyName" required class="mt-2 w-full rounded-xl border px-4 py-3"
      /></label>
      <label class="block text-xs font-semibold uppercase tracking-[0.17em]"
        >Description<br /><textarea v-model="companyDescription" rows="3" class="mt-2 w-full rounded-xl border px-4 py-3"
      /></label>
      <label class="block text-xs font-semibold uppercase tracking-[0.17em]"
        >Website<input v-model.trim="website" placeholder="https://..." type="url" class="mt-2 w-full rounded-xl border px-4 py-3"
      /></label>
    </template>

    <button type="submit" class="mt-4 w-full rounded-xl bg-bff-coral px-6 py-[0.99rem] text-[17px] font-semibold text-bff-deep" :disabled="submitting">
      {{ submitting ? 'Working…' : 'Register' }}
    </button>
    <p v-if="err" class="text-center text-[13px] text-[#bf3f30]">{{ err }}</p>
  </form>

  <RouterLink class="mt-14 block text-center text-[13px]" :to="{ name: 'login' }">Existing member login →</RouterLink>
</template>
