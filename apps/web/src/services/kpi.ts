import { api } from './api'

const sessionStorageKey = 'jbaybff_kpi_session'

function getSessionId() {
  const current = localStorage.getItem(sessionStorageKey)
  if (current) return current
  const next = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  localStorage.setItem(sessionStorageKey, next)
  return next
}

export function trackEvent(eventName: string, metadata?: Record<string, unknown>) {
  const payload = {
    eventName,
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    sessionId: getSessionId(),
    metadata,
  }
  void api.post('/kpi/events', payload).catch(() => undefined)
}
