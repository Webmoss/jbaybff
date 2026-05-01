import { computed } from 'vue'
import { useLocaleStore } from '@/stores/locale'
import type { LocaleMessage } from '@/locales'

export function useLocaleText() {
  const locale = useLocaleStore()
  const messages = computed(() => locale.messages)

  function t(key: keyof LocaleMessage): string {
    return messages.value[key]
  }

  return {
    locale,
    t,
    messages,
  }
}
