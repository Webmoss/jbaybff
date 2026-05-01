import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { localeMessages, type LocaleKey } from '@/locales'

const LOCALE_KEY = 'jbaybff_locale'

function normalizeLocale(value: string | null): LocaleKey {
  if (value === 'af') return 'af'
  return 'en'
}

export const useLocaleStore = defineStore('locale', () => {
  const locale = ref<LocaleKey>(normalizeLocale(localStorage.getItem(LOCALE_KEY)))

  const messages = computed(() => localeMessages[locale.value])

  function setLocale(next: LocaleKey) {
    locale.value = next
    localStorage.setItem(LOCALE_KEY, next)
  }

  return {
    locale,
    messages,
    setLocale,
  }
})
