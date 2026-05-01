<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useHead } from '@unhead/vue'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import { api } from '@/services/api'
import { mediaUrl } from '@/config/http'
import { trackEvent } from '@/services/kpi'

interface Campaign {
  id: string
  title: string
  slug: string
  description: string
  imageUrl?: string | null
  fundingGoal?: string | null
  raisedAmount?: string | null
  sponsors: { sponsor: { companyName: string; logoUrl: string | null } }[]
}

const route = useRoute()
const loading = ref(true)
const missing = ref(false)
const detail = ref<Campaign | null>(null)
const donateEmail = ref('')
const donateName = ref('')
const donateAmount = ref('100')
const donating = ref(false)
const donateMsg = ref('')

async function load(slug: string) {
  loading.value = true
  missing.value = false
  try {
    detail.value = (await api.get<Campaign>(`/campaigns/public/detail/${encodeURIComponent(slug)}`)).data
    trackEvent('campaign_viewed', { slug })
    const canonical = `https://www.jbaybff.org.za/campaigns/${encodeURIComponent(slug)}`
    useHead({
      title: () => `${detail.value?.title ?? 'Campaign'} · JBay Blue Flag`,
      link: () => [{ rel: 'canonical', href: canonical }],
      meta: () => [
        { name: 'description', content: 'Campaign stewardship in Jeffreys Bay.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: `${detail.value?.title ?? 'Campaign'} · JBay Blue Flag` },
        { property: 'og:description', content: 'Campaign stewardship in Jeffreys Bay.' },
        { property: 'og:url', content: canonical },
        { name: 'twitter:title', content: `${detail.value?.title ?? 'Campaign'} · JBay Blue Flag` },
        { name: 'twitter:description', content: 'Campaign stewardship in Jeffreys Bay.' },
      ],
      script: () => [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: detail.value?.title ?? 'Campaign',
            description: detail.value?.description?.slice(0, 180) ?? 'Campaign stewardship in Jeffreys Bay.',
            url: canonical,
          }),
        } as unknown as never,
      ],
    })
  } catch {
    missing.value = true
  } finally {
    loading.value = false
  }
}

watch(() => route.params.slug, (slug) => void load(slug as string), { immediate: true })

async function startCampaignDonation() {
  if (!detail.value) return
  donating.value = true
  donateMsg.value = ''
  try {
    if (!donateEmail.value.trim()) {
      donateMsg.value = 'Add an email so Paystack can send your receipt.'
      return
    }
    const res = await api.post<{ authorizationUrl: string }>('/donations/checkout', {
      email: donateEmail.value.trim(),
      name: donateName.value.trim() || undefined,
      amount: Number(donateAmount.value),
      campaignId: detail.value.id,
    })
    trackEvent('campaign_donation_checkout_started', {
      campaignSlug: detail.value.slug,
      amount: Number(donateAmount.value),
    })
    window.location.href = res.data.authorizationUrl
  } catch {
    donateMsg.value = 'Could not start checkout. Please try again.'
  } finally {
    donating.value = false
  }
}
</script>

<template>
  <div v-if="missing" class="mx-auto flex max-w-lg flex-col items-center gap-6 py-24">
    <h1 class="font-display text-3xl">Campaign not visible</h1>
    <p class="text-center text-[15px] text-bff-blue-grey">Either it’s still in draft mode or offline.</p>
    <RouterLink class="rounded-full bg-bff-deep px-8 py-2.5 text-sm font-semibold text-white hover:bg-[#074e70]" :to="{ name: 'campaigns' }">
      Back to campaigns →
    </RouterLink>
  </div>

  <div v-else-if="detail">
    <section class="relative">
      <div v-if="detail.imageUrl" class="relative h-[46vh] min-h-[250px] w-full bg-bff-deep sm:h-[min(52vh,_500px)]">
        <img
          :src="mediaUrl(detail.imageUrl)"
          class="absolute inset-0 size-full object-cover opacity-90"
          loading="lazy"
          :alt="'Hero ' + detail.title"
        />
      </div>
      <div class="relative z-[1] bff-shell-band pb-10 pt-10 sm:pb-14 sm:pt-[4.75rem]">
        <p class="bff-kicker text-white/85">Campaign</p>
        <h1 class="font-display text-[2rem] leading-tight text-white sm:text-[2.75rem]">{{ detail.title }}</h1>
      </div>
    </section>
    <SectionPanel tone="white">
      <div class="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
        <div class="space-y-6">
          <p class="max-w-none whitespace-pre-wrap text-[17px] leading-relaxed text-bff-blue-grey">
            {{ detail.description }}
          </p>
          <div class="bff-card px-6 py-6">
            <p class="bff-kicker">Related participation</p>
            <div class="mt-4 flex flex-wrap gap-3">
              <RouterLink class="bff-button-secondary" to="/actions">Take Action</RouterLink>
              <RouterLink class="bff-button-secondary" to="/events">Join Events</RouterLink>
              <RouterLink class="bff-button-secondary" to="/impact">View Impact</RouterLink>
            </div>
          </div>
        </div>

        <aside class="space-y-5">
          <div class="bff-card px-6 py-6">
            <h2 class="font-display text-2xl">Support this campaign</h2>
            <p class="mt-3 text-sm text-bff-blue-grey">Secure checkout via Paystack in ZAR.</p>
            <div class="mt-5 grid gap-3">
              <label class="grid gap-1.5 text-sm font-medium text-bff-deep/85">
                Email
                <input v-model="donateEmail" type="email" placeholder="you@example.com" class="rounded-xl border px-4 py-3" />
              </label>
              <label class="grid gap-1.5 text-sm font-medium text-bff-deep/85">
                Name (optional)
                <input v-model="donateName" type="text" placeholder="Your name" class="rounded-xl border px-4 py-3" />
              </label>
              <label class="grid gap-1.5 text-sm font-medium text-bff-deep/85">
                Amount (ZAR)
                <input v-model="donateAmount" type="number" min="1" step="1" class="rounded-xl border px-4 py-3" />
              </label>
            </div>
            <button
              type="button"
              class="mt-4 w-full rounded-xl bg-bff-deep px-6 py-3 text-sm font-semibold text-white hover:bg-[#074e70]"
              :disabled="donating"
              @click="startCampaignDonation"
            >
              {{ donating ? 'Redirecting…' : 'Donate with Paystack' }}
            </button>
            <p v-if="donateMsg" class="mt-3 text-sm text-bff-blue-grey" role="status">{{ donateMsg }}</p>
          </div>
          <div class="bff-card px-6 py-6">
            <h3 class="font-display text-xl">Linked sponsors</h3>
            <div class="mt-4 space-y-3">
              <div v-for="(slot, idx) in detail.sponsors" :key="idx" class="rounded-2xl bg-bff-sand/40 px-4 py-3">
                <p class="font-semibold">{{ slot.sponsor.companyName }}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </SectionPanel>
  </div>

  <p v-else-if="loading" class="py-[18vh] text-center font-medium text-bff-blue-grey">Loading…</p>
</template>
