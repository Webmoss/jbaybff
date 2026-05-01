import axios from 'axios'
import type { RouteLocationNormalized } from 'vue-router'
import { apiBaseUrl } from '@/config/http'
import type { AuthResponse, User } from '@/types/api'

export const api = axios.create({
  baseURL: apiBaseUrl || '/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
})

export function setAuthHeader(token: string | null) {
  if (!token) {
    delete api.defaults.headers.common['Authorization']
    return
  }
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

export async function loginRequest(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
  return data
}

export async function registerRequest(body: Record<string, unknown>): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', body)
  return data
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>('/users/me')
  return data
}

export const redirectGuardKey = 'jbaybff_redirect'

export function rememberRedirect(to: RouteLocationNormalized) {
  const path = to.fullPath
  if (path.startsWith('/auth')) return
  sessionStorage.setItem(redirectGuardKey, path)
}

export function consumeRedirect(fallback = '/'): string {
  const p = sessionStorage.getItem(redirectGuardKey)
  sessionStorage.removeItem(redirectGuardKey)
  return p && !p.startsWith('/auth') ? p : fallback
}
