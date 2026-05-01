import { en } from './en'
import { af } from './af'

export const localeMessages = {
  en,
  af,
}

export type LocaleKey = keyof typeof localeMessages
export type LocaleMessage = typeof en
