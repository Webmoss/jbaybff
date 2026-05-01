<script setup lang="ts">
import { useHead } from '@unhead/vue'
import SectionPanel from '@/components/ui/SectionPanel.vue'
useHead({ title: 'Contact · Jeffreys Bay Blue Flag' })
</script>

<template>
  <SectionPanel tone="sand">
    <div class="grid gap-12 lg:grid-cols-[minmax(0,_1fr),minmax(0,_460px)]">
      <section>
        <h1 class="font-display text-[2.72rem]">Let’s steward together.</h1>
        <p class="mt-7 max-w-2xl text-[1.065rem] leading-relaxed text-bff-blue-grey">
          Outreach for school workshops, shoreline partnerships, and media enquiries.
        </p>
        <!-- Email placeholders — wire Resend/Brevo/AWS SES outbound when DNS is verified -->
        <div class="mt-12 rounded-[28px] border border-black/[0.08] bg-white p-10 shadow-wave">
          <p class="text-sm uppercase tracking-[0.24em] text-bff-deep/55">Prefer email?</p>
          <a href="mailto:hello@jbaybff.org.za" class="mt-8 block font-display text-[1.45rem] text-bff-deep underline-offset-[6px] hover:underline">hello@jbaybff.org.za</a>
          <p class="mt-6 text-[13px] text-bff-deep/72">SMTP / transactional provider integration is stubbed behind this URL.</p>
        </div>
      </section>
      <aside class="rounded-[28px] border border-dashed border-bff-blue-grey/52 bg-linear-to-br from-white to-bff-aqua/[0.12] px-14 py-[4.625rem]" aria-label="Form placeholder">
        <p class="font-accent text-[2rem] leading-tight text-bff-deep">
          Form submits post to `/api/contact` in a future release.
        </p>
      </aside>
    </div>
  </SectionPanel>
</template>
