<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { api } from '@/services/api'
import { trackEvent } from '@/services/kpi'
import SectionPanel from '@/components/ui/SectionPanel.vue'
import HeroBanner from '@/components/ui/HeroBanner.vue'

useHead({ title: 'Partnerships · Jeffreys Bay Blue Flag' })

type PartnershipType = 'CORPORATE' | 'SCHOOL' | 'CLUB' | 'NGO' | 'OTHER'

const submitting = ref(false)
const notice = ref('')
const form = reactive({
  organization: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  type: 'CORPORATE' as PartnershipType,
  message: '',
  pledgeAmount: '',
})

const canSubmit = computed(
  () =>
    form.organization.trim().length > 1 &&
    form.contactName.trim().length > 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim()),
)

async function submit() {
  if (!canSubmit.value) {
    notice.value = 'Please complete organization, contact name, and a valid email.'
    return
  }
  submitting.value = true
  notice.value = ''
  try {
    await api.post('/partnerships/public/inquiries', {
      organization: form.organization.trim(),
      contactName: form.contactName.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone || undefined,
      website: form.website || undefined,
      type: form.type,
      message: form.message || undefined,
      pledgeAmount: form.pledgeAmount ? Number(form.pledgeAmount) : undefined,
    })
    trackEvent('partnership_inquiry_submitted', { type: form.type })
    notice.value = 'Thanks, your partnership inquiry has been submitted.'
    form.organization = ''
    form.contactName = ''
    form.contactEmail = ''
    form.contactPhone = ''
    form.website = ''
    form.type = 'CORPORATE'
    form.message = ''
    form.pledgeAmount = ''
  } catch {
    notice.value = 'Could not submit inquiry right now. Please try again.'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  trackEvent('partnership_page_viewed')
})
</script>

<template>
  <SectionPanel tone="white">
    <HeroBanner
      kicker="Partnerships"
      title="Partner with JBay BFF"
      subtitle="Collaborate with us on coastal impact through sponsorships, volunteering days, and program support."
    />
  </SectionPanel>

  <SectionPanel tone="sand">
    <div class="mx-auto max-w-3xl rounded-3xl border border-black/10 bg-white p-6 shadow-wave sm:p-8">
      <h2 class="font-display text-3xl">Partnership inquiry</h2>
      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <input v-model="form.organization" type="text" placeholder="Organization" class="rounded-xl border px-4 py-3 sm:col-span-2" />
        <input v-model="form.contactName" type="text" placeholder="Contact name" class="rounded-xl border px-4 py-3" />
        <input v-model="form.contactEmail" type="email" placeholder="Contact email" class="rounded-xl border px-4 py-3" />
        <input v-model="form.contactPhone" type="text" placeholder="Phone (optional)" class="rounded-xl border px-4 py-3" />
        <input v-model="form.website" type="url" placeholder="Website (optional)" class="rounded-xl border px-4 py-3" />
        <select v-model="form.type" class="rounded-xl border px-4 py-3">
          <option value="CORPORATE">Corporate</option>
          <option value="SCHOOL">School</option>
          <option value="CLUB">Club</option>
          <option value="NGO">NGO</option>
          <option value="OTHER">Other</option>
        </select>
        <input v-model="form.pledgeAmount" type="number" min="0" step="1" placeholder="Pledge amount (ZAR, optional)" class="rounded-xl border px-4 py-3" />
        <textarea v-model="form.message" rows="5" placeholder="Tell us how you'd like to partner." class="rounded-xl border px-4 py-3 sm:col-span-2" />
      </div>
      <button type="button" class="mt-6 w-full rounded-xl bg-bff-deep px-6 py-3 text-sm font-semibold text-white hover:bg-[#074e70] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" :disabled="submitting || !canSubmit" @click="submit">
        {{ submitting ? 'Submitting…' : 'Submit inquiry' }}
      </button>
      <p v-if="notice" class="mt-4 text-sm text-bff-blue-grey" role="status">{{ notice }}</p>
    </div>
  </SectionPanel>
</template>
