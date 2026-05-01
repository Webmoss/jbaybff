const raw = import.meta.env.VITE_API_URL ?? ''
export const apiBaseUrl = raw.replace(/\/$/, '')

const fromApi =
  apiBaseUrl.replace(/\/?api\/?$/i, '') || ''
const assetBaseRaw =
  (import.meta.env.VITE_ASSET_BASE as string | undefined) ?? fromApi
export const assetBaseUrl = assetBaseRaw.replace(/\/$/, '')

/** Turn `/uploads/...` into absolute URLs for `<img>` tags */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${assetBaseUrl}${url.startsWith('/') ? url : '/' + url}`
}
