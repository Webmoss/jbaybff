<script setup lang="ts">
const props = defineProps<{ size?: number }>()
const size = props.size ?? 56
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    role="img"
    aria-labelledby="bff-logo-title"
    class="flex-shrink-0 drop-shadow-wave"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title id="bff-logo-title">Jeffreys Bay Blue Flag Foundation</title>
    <defs>
      <linearGradient id="bffHeart" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color: #13788e" />
        <stop offset="50%" style="stop-color: #6acad7" />
        <stop offset="100%" style="stop-color: #f47263" />
      </linearGradient>
      <linearGradient id="bffWaveBg" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color: #023750" />
        <stop offset="60%" style="stop-color: #13788e" />
        <stop offset="100%" style="stop-color: #6acad7" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="31" fill="url(#bffWaveBg)" opacity="0.95" />
    <path
      fill="none"
      stroke="rgba(223,214,201,0.5)"
      stroke-width="2"
      d="M4 42c14-22 42-22 56 0"
    />
    <path
      fill="url(#bffHeart)"
      d="M32 52c-.4 0-.7-.14-1-.4-7.63-7.52-22-18.92-22-28.94 0-6.3 5.06-11.56 11.25-11.56 5.14 0 9.62 3.54 11.56 8.53 2.06-5.14 7.62-9.53 11.94-9.53C47.93 11.1 54 17.62 54 24.92c0 10.2-13.94 21.72-21 29.54-.37.43-.93.76-2 .74z"
      transform="translate(0,-2)"
    />
  </svg>
</template>
