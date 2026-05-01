<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useLocaleText } from '@/composables/useLocaleText'

const { t } = useLocaleText()

const socialLinks = [
  { name: 'X', href: 'https://x.com/jbaybff', active: true },
  { name: 'Facebook', href: 'https://www.facebook.com/jbaybff/', active: true },
  { name: 'Instagram', href: '', active: false },
  { name: 'YouTube', href: '', active: false },
]

const campaignPartners = [
  { name: 'BackaBuddy', href: 'https://www.backabuddy.co.za/' },
]
</script>

<template>
  <footer class="bg-bff-deep pb-16 pt-14 text-sm text-white/95">
    <div class="bff-shell-band">
      <div class="rounded-3xl border border-white/15 bg-white/[0.04] p-6 shadow-wave sm:p-8">
        <div class="grid gap-10 lg:grid-cols-[1.1fr,1fr]">
          <div class="space-y-4">
            <p class="font-display text-3xl text-bff-aqua">{{ t('tagline') }}</p>
            <p class="max-w-xl text-white/85">
              {{ t('footerProtecting') }}
            </p>
            <div class="grid max-w-xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-xl bg-white/8 px-3 py-3 text-center">
                <p class="text-[11px] uppercase tracking-[0.16em] text-bff-aqua">{{ t('footerStarter') }}</p>
                <p class="mt-1 font-semibold">R100/mo</p>
              </div>
              <div class="rounded-xl bg-white/8 px-3 py-3 text-center">
                <p class="text-[11px] uppercase tracking-[0.16em] text-bff-aqua">{{ t('footerSteward') }}</p>
                <p class="mt-1 font-semibold">R200/mo</p>
              </div>
              <div class="rounded-xl bg-white/8 px-3 py-3 text-center">
                <p class="text-[11px] uppercase tracking-[0.16em] text-bff-aqua">{{ t('footerGuardian') }}</p>
                <p class="mt-1 font-semibold">R500/mo</p>
              </div>
              <div class="rounded-xl bg-white/8 px-3 py-3 text-center">
                <p class="text-[11px] uppercase tracking-[0.16em] text-bff-aqua">{{ t('footerChampion') }}</p>
                <p class="mt-1 font-semibold">R1000/mo</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <RouterLink class="bff-button-primary" to="/campaigns">{{ t('navDonate') }}</RouterLink>
              <RouterLink class="rounded-full border border-white/35 px-5 py-2.5 font-semibold hover:bg-white/10" to="/actions">{{ t('navActions') }}</RouterLink>
            </div>
          </div>

          <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <h3 class="font-semibold uppercase tracking-[0.2em] text-bff-aqua/90">{{ t('navLearn') }}</h3>
              <ul class="mt-3 space-y-2">
                <li><RouterLink class="underline-offset-4 hover:underline" to="/about">{{ t('navAbout') }}</RouterLink></li>
                <li><RouterLink class="underline-offset-4 hover:underline" to="/campaigns">{{ t('navCampaigns') }}</RouterLink></li>
                <li><RouterLink class="underline-offset-4 hover:underline" to="/blog">{{ t('navNews') }}</RouterLink></li>
                <li><RouterLink class="underline-offset-4 hover:underline" to="/impact">{{ t('navImpact') }}</RouterLink></li>
              </ul>
            </div>

            <div>
              <h3 class="font-semibold uppercase tracking-[0.2em] text-bff-aqua/90">{{ t('navGetInvolved') }}</h3>
              <ul class="mt-3 space-y-2">
                <li><RouterLink class="underline-offset-4 hover:underline" to="/actions">{{ t('navActions') }}</RouterLink></li>
                <li><RouterLink class="underline-offset-4 hover:underline" to="/events">{{ t('navEvents') }}</RouterLink></li>
                <li><RouterLink class="underline-offset-4 hover:underline" to="/contact">{{ t('navVolunteer') }}</RouterLink></li>
              </ul>
            </div>

            <div>
              <h3 class="font-semibold uppercase tracking-[0.2em] text-bff-aqua/90">{{ t('footerCampaignPartners') }}</h3>
              <ul class="mt-3 space-y-2">
                <li><RouterLink class="underline-offset-4 hover:underline" to="/partnerships">{{ t('footerPartnerInquiry') }}</RouterLink></li>
                <li v-for="partner in campaignPartners" :key="partner.name">
                  <a class="underline-offset-4 hover:underline" :href="partner.href" target="_blank" rel="noopener noreferrer">{{ partner.name }}</a>
                </li>
                <li class="text-white/70">{{ t('footerMoreComing') }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8 grid gap-5 text-xs text-white/65 md:grid-cols-[1fr,auto] md:items-center">
        <p>© {{ new Date().getFullYear() }} Jeffreys Bay Blue Flag Foundation · Jeffreys Bay, Eastern Cape, South Africa</p>
        <div class="flex flex-wrap items-center gap-4">
          <div class="-mx-1 max-w-full overflow-x-auto px-1 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0">
            <div class="flex w-max items-center gap-2 sm:w-auto sm:flex-wrap">
            <a
              v-for="social in socialLinks"
              :key="social.name"
              :href="social.active ? social.href : undefined"
              :aria-label="social.active ? social.name : `${social.name} (coming soon)`"
              :title="social.active ? social.name : `${social.name} coming soon`"
              class="inline-flex min-w-[3.4rem] flex-col items-center justify-center gap-1 rounded-xl border border-white/25 px-2 py-1.5 text-white/90 transition sm:size-9 sm:min-w-0 sm:rounded-full sm:p-0"
              :class="social.active ? 'hover:border-bff-aqua hover:text-bff-aqua' : 'cursor-not-allowed opacity-45'"
              :target="social.active ? '_blank' : undefined"
              :rel="social.active ? 'noopener noreferrer' : undefined"
              :aria-disabled="social.active ? undefined : 'true'"
              @click.prevent="!social.active"
            >
              <svg v-if="social.name === 'X'" class="size-4 fill-current" viewBox="0 0 19 19" aria-hidden="true">
                <path d="M1.893 1.98c.052.072 1.245 1.769 2.653 3.77l2.892 4.114c.183.261.333.48.333.486s-.068.089-.152.183l-.522.593-.765.867-3.597 4.087c-.375.426-.734.834-.798.905a1 1 0 0 0-.118.148c0 .01.236.017.664.017h.663l.729-.83c.4-.457.796-.906.879-.999a692 692 0 0 0 1.794-2.038c.034-.037.301-.34.594-.675l.551-.624.345-.392a7 7 0 0 1 .34-.374c.006 0 .93 1.306 2.052 2.903l2.084 2.965.045.063h2.275c1.87 0 2.273-.003 2.266-.021-.008-.02-1.098-1.572-3.894-5.547-2.013-2.862-2.28-3.246-2.273-3.266.008-.019.282-.332 2.085-2.38l2-2.274 1.567-1.782c.022-.028-.016-.03-.65-.03h-.674l-.3.342a871 871 0 0 1-1.782 2.025c-.067.075-.405.458-.75.852a100 100 0 0 1-.803.91c-.148.172-.299.344-.99 1.127-.304.343-.32.358-.345.327-.015-.019-.904-1.282-1.976-2.808L6.365 1.85H1.8z" />
              </svg>
              <svg v-else-if="social.name === 'Facebook'" class="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.6 1.7-1.6h1.5V3.8c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.3-3.8 3.9V10H8v3h2.9v8h2.6z" />
              </svg>
              <svg v-else-if="social.name === 'Instagram'" class="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3m0 1.8A2.7 2.7 0 0 0 4.8 7.5v9a2.7 2.7 0 0 0 2.7 2.7h9a2.7 2.7 0 0 0 2.7-2.7v-9a2.7 2.7 0 0 0-2.7-2.7h-9M17.1 6.3a.6.6 0 1 0 0 1.2.6.6 0 0 0 0-1.2M12 8.1a3.9 3.9 0 1 1 0 7.8 3.9 3.9 0 0 1 0-7.8m0 1.8a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2"/>
              </svg>
              <svg v-else class="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.6 4.5 12 4.5 12 4.5s-5.6 0-7.5.6A3 3 0 0 0 2.4 7.2 31.6 31.6 0 0 0 1.8 12c0 1.7.2 3.4.6 4.8a3 3 0 0 0 2.1 2.1c1.9.6 7.5.6 7.5.6s5.6 0 7.5-.6a3 3 0 0 0 2.1-2.1c.4-1.4.6-3.1.6-4.8 0-1.7-.2-3.4-.6-4.8M10.2 15.3V8.7L15.9 12z"/>
              </svg>
              <span class="text-[10px] leading-none sm:hidden">{{ social.name }}</span>
            </a>
            </div>
          </div>
          <a class="hover:text-bff-aqua" href="mailto:info@jbaybff.org.za">info@jbaybff.org.za</a>
          <RouterLink class="hover:text-bff-aqua" to="/contact">{{ t('navContact') }}</RouterLink>
        </div>
      </div>
    </div>
  </footer>
</template>
