<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { consumeRedirect } from '@/services/api'

const email = ref('')
const pw = ref('')
const err = ref('')
const submitting = ref(false)

const router = useRouter()
const route = useRoute()

const auth = useAuthStore()

async function submit() {
  submitting.value = true
  err.value = ''
  try {
    await auth.login(email.value, pw.value.trim())
    const q = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    router.push(q || consumeRedirect(auth.isAdmin ? '/admin' : '/dashboard'))
  } catch {
    err.value = 'Incorrect email or password — try seeded admin or demo donor credentials.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <h1 class="font-display text-[2rem] tracking-tight text-bff-deep">Welcome back</h1>
  <p class="mt-4 text-[15px] leading-relaxed text-bff-blue-grey/95">
    No password reset yet — scaffold ships bcrypt + JWT for admin/donors first.
  </p>

  <form class="mt-10 space-y-6" autocomplete="off" @submit.prevent="submit">
    <label class="block text-xs font-semibold uppercase tracking-[0.18em] text-bff-deep">Email <input type="email" required v-model="email" autocomplete="username" aria-required="true" class="font-body mt-2 w-full rounded-2xl border border-bff-deep/[0.11] px-5 py-[0.955rem] text-[17px]" /></label>
    <label class="block text-xs font-semibold uppercase tracking-[0.18em] text-bff-deep">
      Password
      <input
        type="password"
        autocomplete="current-password"
        required
        v-model="pw"
        aria-required="true"
        class="font-body mt-2 w-full rounded-2xl border border-bff-deep/[0.11] px-5 py-[0.955rem] text-[17px]"
      />
    </label>
    <button
      type="submit"
      :disabled="submitting"
      class="w-full rounded-2xl bg-bff-deep px-6 py-[0.9625rem] text-[17px] font-semibold tracking-tight text-white shadow-wave disabled:opacity-45"
    >
      {{ submitting ? 'Checking…' : 'Sign in' }}
    </button>
    <p v-if="err" class="text-center text-[14px] font-medium text-[#bf3f30]">{{ err }}</p>
  </form>

  <RouterLink class="mt-14 block text-center text-[14px] text-bff-blue-grey hover:text-bff-deep hover:underline" :to="{ name: 'register' }">
    No account yet? Sponsor or donate onboarding →
  </RouterLink>
</template>
