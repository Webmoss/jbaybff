<script setup lang="ts">
import { RouterView } from 'vue-router'
import JBayHeartLogo from '@/components/branding/JBayHeartLogo.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-bff-deep lg:flex-row">
    <aside
      class="relative hidden lg:flex lg:w-2/5 flex-col bg-linear-to-br from-bff-deep via-bff-blue-grey to-[#0a5870] px-14 py-20 text-white"
    >
      <div class="absolute inset-x-10 top-28 h-[360px] rounded-[40px] bg-bff-aqua/10 blur-[100px]" />
      <div class="relative flex flex-col gap-6">
        <JBayHeartLogo :size="80" />
        <p class="font-accent text-3xl leading-snug text-bff-aqua/95">Ocean care is community care.</p>
      </div>
      <svg
        class="relative mt-auto w-full opacity-95"
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
        viewBox="0 0 600 240"
      >
        <path fill="#6acad744" d="M0,120 Q150,210 320,132 T590,146 V240 H0 Z" />
        <path
          fill="none"
          stroke="#f4726366"
          stroke-width="2"
          d="M40,174 Q170,244 344,174 T578,174"
        />
      </svg>
    </aside>

    <div class="flex flex-1 items-center justify-center px-6 py-12">
      <div class="relative w-full max-w-md rounded-3xl bg-white px-8 py-10 shadow-wave ring-1 ring-bff-deep/10">
        <RouterView />
      </div>
    </div>
  </div>
</template>
