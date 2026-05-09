<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLocaleText } from '@/composables/useLocaleText'
import type { LocaleMessage } from '@/locales'
import JBayHeartLogo from '@/components/branding/JBayHeartLogo.vue'

const route = useRoute()
const auth = useAuthStore()
const { locale, t } = useLocaleText()
const mobileOpen = ref(false)

const portalLabel = computed(() => {
  if (auth.isAdmin) return t('navAdmin')
  if (auth.isSponsor && auth.user?.sponsor?.companyName)
    return auth.user.sponsor.companyName.split(' ')[0]
  return t('navPortal')
})

const portalTo = computed(() => (auth.isAdmin ? '/admin' : '/dashboard'))

const learnLinks = [
  { to: '/about', key: 'navAbout' },
  { to: '/programs', key: 'navPrograms' },
  { to: '/blog', key: 'navNews' },
  { to: '/campaigns', key: 'navCampaigns' },
  { to: '/impact', key: 'navImpact' },
]

const involveLinks = [
  { to: '/actions', key: 'navActions' },
  { to: '/events', key: 'navEvents' },
  { to: '/partnerships', key: 'navPartnerships' },
  { to: '/contact', key: 'navVolunteer' },
]

function navLabel(key: string) {
  const value = t(key as keyof LocaleMessage)
  return value ?? key
}
</script>

<template>
  <header class="sticky top-0 z-40">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-white focus:text-bff-deep focus:px-4 focus:py-2"
    >
      {{ t('skipToContent') }}
    </a>

    <div class="bff-top-utility">
      <div class="bff-shell-band flex flex-wrap items-center justify-end gap-2 py-2.5 text-xs font-medium sm:justify-between">
        <p class="hidden text-balance sm:block">{{ t('utilityTagline') }}</p>
        <div class="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <RouterLink class="rounded-full bg-bff-coral px-3 py-1.5 text-bff-deep font-semibold sm:px-4" to="/actions">{{ t('navActions') }}</RouterLink>
          
          <RouterLink class="hidden rounded-full border border-bff-deep/20 px-3 py-1.5 font-semibold sm:inline-flex sm:px-4" to="/campaigns">{{ t('navDonate') }}</RouterLink>
          <div class="hidden sm:inline-flex">
            <select
              :value="locale.locale"
              :aria-label="t('navLanguage')"
              class="rounded-full border border-bff-deep/20 bg-white/80 px-2 py-1 text-[11px] font-semibold text-bff-deep"
              @change="locale.setLocale(($event.target as HTMLSelectElement).value as 'en' | 'af')"
            >
              <option value="en">EN</option>
              <option value="af">AF</option>
            </select>
          </div>
          <template v-if="auth.isAuthed">
            <RouterLink :to="portalTo" class="hidden rounded-full border border-bff-deep/20 px-3 py-1.5 sm:inline-flex sm:px-4">{{ portalLabel }}</RouterLink>
          </template>
          <template v-else>
            <RouterLink to="/auth/login" class="hidden rounded-full border border-bff-deep/20 px-3 py-1.5 sm:inline-flex sm:px-4">{{ t('navLogin') }}</RouterLink>
          </template>
        </div>
      </div>
    </div>

    <div class="bff-main-nav text-white">
      <div class="bff-shell-band flex items-center justify-between gap-3 py-3 sm:gap-4 sm:py-4">
        <RouterLink class="flex min-w-0 items-center gap-2 sm:gap-3" to="/">
          <JBayHeartLogo :size="38" alt="" />
          <div class="min-w-0 leading-tight">
            <p class="truncate font-display text-base font-semibold tracking-tight sm:text-2xl">{{ t('brand') }}</p>
            <p class="hidden text-sm font-medium text-white/85 sm:block">{{ t('platformLabel') }}</p>
          </div>
        </RouterLink>

        <nav class="hidden items-center gap-7 text-sm font-semibold lg:flex" aria-label="Primary">
          <RouterLink to="/" class="hover:text-bff-aqua" :class="route.path === '/' ? 'text-bff-aqua' : ''">{{ t('navHome') }}</RouterLink>

          <details class="group relative">
            <summary class="list-none cursor-pointer rounded-full px-2 py-1 hover:text-bff-aqua">{{ t('navLearn') }}</summary>
            <div class="absolute left-0 top-10 min-w-[220px] rounded-2xl border border-black/10 bg-white p-2 text-bff-deep shadow-wave">
              <RouterLink v-for="l in learnLinks" :key="l.to" :to="l.to" class="block rounded-xl px-3 py-2 hover:bg-bff-sand/30">{{ navLabel(l.key) }}</RouterLink>
            </div>
          </details>
          <details class="group relative">
            <summary class="list-none cursor-pointer rounded-full px-2 py-1 hover:text-bff-aqua">{{ t('navGetInvolved') }}</summary>
            <div class="absolute left-0 top-10 min-w-[220px] rounded-2xl border border-black/10 bg-white p-2 text-bff-deep shadow-wave">
              <RouterLink v-for="l in involveLinks" :key="l.to" :to="l.to" class="block rounded-xl px-3 py-2 hover:bg-bff-sand/30">{{ navLabel(l.key) }}</RouterLink>
            </div>
          </details>
          <RouterLink to="/dashboard" class="hover:text-bff-aqua" :class="route.path.startsWith('/dashboard') ? 'text-bff-aqua' : ''">{{ t('navMembership') }}</RouterLink>
          <RouterLink to="/shop" class="hover:text-bff-aqua" :class="route.path.startsWith('/shop') ? 'text-bff-aqua' : ''">{{ t('navShop') }}</RouterLink>
        </nav>

        <button
          class="rounded-full border border-white/35 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 lg:hidden"
          :aria-expanded="mobileOpen"
          aria-controls="mobile-menu"
          @click="mobileOpen = !mobileOpen"
        >
          {{ t('navMenu') }}
        </button>
      </div>

      <!-- Mobile Menu Start -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-1 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-1 opacity-0"
      >
        <div v-if="mobileOpen" id="mobile-menu" class="bff-shell-band pb-4 lg:hidden">
          <div class="rounded-2xl bg-white p-3 text-bff-deep shadow-wave">
          <RouterLink
            v-for="item in [
              ['/', t('navHome')],
              ['/about', t('navAbout')],
              ['/programs', t('navPrograms')],
              ['/campaigns', t('navCampaigns')],
              ['/actions', t('navActions')],
              ['/events', t('navEvents')],
              ['/partnerships', t('navPartnerships')],
              ['/blog', t('navNews')],
              ['/contact', t('navContact')],
              ['/dashboard', t('navMembership')],
              ['/shop', t('navShop')],
            ]"
            :key="item[0]"
            :to="item[0]"
            class="block rounded-xl px-3 py-2 hover:bg-bff-sand/30"
            @click="mobileOpen = false"
          >
            {{ item[1] }}
          </RouterLink>
          <div class="mt-2">
            <label class="sr-only" for="mobile-language-select">{{ t('navLanguage') }}</label>
            <div class="relative">
              <select
                id="mobile-language-select"
                :value="locale.locale"
                class="h-11 w-full appearance-none rounded-full border border-black/15 bg-white px-5 pr-10 text-sm font-semibold text-bff-deep"
                @change="locale.setLocale(($event.target as HTMLSelectElement).value as 'en' | 'af')"
              >
                <option value="en">EN</option>
                <option value="af">AF</option>
              </select>
              <svg
                class="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-bff-deep/70"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
          </div>
        </div>
        </div>
      </Transition>
      <!-- Mobile Menu End -->
    </div>
  </header>
</template>
