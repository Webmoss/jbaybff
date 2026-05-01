<script setup lang="ts">
import { useHead } from '@unhead/vue'
import SectionPanel from '@/components/ui/SectionPanel.vue'
useHead({ title: 'About · Jeffreys Bay Blue Flag' })
</script>

<template>
  <article>
    <SectionPanel tone="sand">
      <h1 class="font-display text-[2.5rem]">From Blue Flag benchmarks to barefoot volunteers.</h1>
      <p class="mt-7 max-w-3xl whitespace-pre-wrap text-[1.065rem] leading-relaxed text-bff-blue-grey">
        Founded to protect Dolphin Beach through international Blue Flag benchmarks, Jeffreys Bay Blue Flag Foundation
        pairs science-backed monitoring with gritty community stewardship. Teams track debris patterns, elevate youth
        lifesavers, and resource campaigns that municipalities can amplify.
      </p>
    </SectionPanel>

    <SectionPanel tone="aqua" wave>
      <div class="grid gap-14 lg:grid-cols-2">
        <section>
          <h2 class="font-display text-2xl text-bff-deep">What stewardship looks like locally</h2>
          <ul class="mt-6 space-y-4 text-[15px] leading-relaxed text-bff-blue-grey">
            <li>Partnered micro-grants when waste infrastructure needs a quick uplift.</li>
            <li>Seasonal swell-week education booths for surfers and shoreline visitors.</li>
            <li>Transparent KPI dashboards shared with Kouga stakeholders.</li>
          </ul>
        </section>
        <aside class="rounded-[28px] border border-black/[0.05] bg-white p-12 shadow-wave">
          <p class="text-xs uppercase tracking-[0.24em] text-bff-blue-grey">Principles</p>
          <p class="font-accent mt-6 text-[1.875rem] text-bff-deep">Care that scales with the tides.</p>
          <ul class="mt-8 grid gap-3 text-[15px] text-bff-blue-grey">
            <li>Environmental rigor first</li>
            <li>Community seats at decisions</li>
            <li>Fundraising narratives that honour local culture</li>
          </ul>
        </aside>
      </div>
    </SectionPanel>

    <SectionPanel tone="sand">
      <h2 class="font-display text-2xl text-bff-deep">Operational transparency</h2>
      <p class="mt-5 max-w-3xl whitespace-pre-wrap text-[15px] leading-relaxed text-bff-blue-grey">
        This codebase ships audited REST endpoints, bcrypt’d credentials, JWT sessions, throttle guards, helmet headers,
        and Prisma-managed MySQL schemas — optimised for hosts like Xneelo where managed MySQL is first-class.
      </p>
    </SectionPanel>
  </article>
</template>
