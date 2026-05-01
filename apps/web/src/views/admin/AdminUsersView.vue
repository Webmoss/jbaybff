<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/services/api'

type Row = {
  id: string
  email: string
  name: string
  role: string
}

const rows = ref<Row[]>([])

;(async () => {
  const res = await api.get<Row[]>('/users')
  rows.value = res.data
})().catch(() => {
  rows.value = []
})
</script>

<template>
  <div>
    <h1 class="font-display text-[2rem] tracking-tighter">Humans onboarded via JWT issuance</h1>
    <p class="mt-5 max-w-xl text-[15px] text-bff-deep/[0.68]">
      Password hashes never traverse this listing — bcrypt lives server-side.
    </p>
    <div class="mt-16 overflow-auto rounded-[32px] border border-black/[0.07]">
      <table class="relative z-[62] min-w-[720px] border-collapse rounded-[inherit] text-left text-[15px] [&_thead]:bg-[#eae6df] [&_thead]:text-[12px] [&_thead]:uppercase [&_thead]:tracking-[0.18em]" aria-label="User directory">
        <thead>
          <tr>
            <th class="px-[1.9625rem] py-[18px]">Name</th>
            <th class="px-[1.9625rem] py-[18px]">Email</th>
            <th class="px-[1.9625rem] py-[18px]">RBAC tier</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in rows" :key="user.id" class="border-t border-black/[0.058] [&>td]:px-[31px] [&>td]:py-[26px]">
            <td class="relative z-[71]">{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td class="font-medium uppercase tracking-[0.12em] text-bff-blue-grey">{{ user.role }}</td>
          </tr>
          <tr v-if="rows.length === 0">
            <td class="relative z-[71] px-8 py-12 text-[15px]" colspan="3">No rows — seed Prisma?</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
