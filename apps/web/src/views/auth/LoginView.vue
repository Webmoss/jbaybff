<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { consumeRedirect } from '@/services/api'

const email = ref('')
const pw = ref('')
const showPw = ref(false)
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
    <div class="space-y-2">
      <label for="password" class="block text-xs font-semibold uppercase tracking-[0.18em] text-bff-deep">
        Password
      </label>
      <div class="relative">
        <input
          id="password"
          :type="showPw ? 'text' : 'password'"
          autocomplete="current-password"
          required
          v-model="pw"
          aria-required="true"
          class="font-body w-full rounded-2xl border border-bff-deep/[0.11] px-5 py-[0.955rem] pr-12 text-[17px]"
        />
        <button
          type="button"
          @click="showPw = !showPw"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-bff-deep/50 transition-colors hover:text-bff-deep focus:text-bff-deep"
          :aria-label="showPw ? 'Hide password' : 'Show password'"
        >
          <svg v-if="showPw" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>
      </div>
    </div>
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
