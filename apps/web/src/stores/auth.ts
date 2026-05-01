import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User } from '@/types/api'
import { fetchMe, loginRequest, registerRequest, setAuthHeader } from '@/services/api'

const TOKEN_KEY = 'jbaybff_token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<User | null>(null)
  const bootstrapped = ref(false)

  const isAuthed = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isSponsor = computed(() => user.value?.role === 'SPONSOR')

  if (token.value) setAuthHeader(token.value)

  async function hydrate() {
    if (!token.value) {
      bootstrapped.value = true
      return
    }
    try {
      setAuthHeader(token.value)
      user.value = await fetchMe()
    } catch {
      token.value = null
      localStorage.removeItem(TOKEN_KEY)
      setAuthHeader(null)
    } finally {
      bootstrapped.value = true
    }
  }

  function applySession(next: { user: User; access_token: string }) {
    token.value = next.access_token
    user.value = next.user
    localStorage.setItem(TOKEN_KEY, next.access_token)
    setAuthHeader(next.access_token)
  }

  async function login(email: string, password: string) {
    applySession(await loginRequest(email, password))
  }

  async function register(payload: Record<string, unknown>) {
    applySession(await registerRequest(payload))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    setAuthHeader(null)
  }

  return {
    token,
    user,
    bootstrapped,
    isAuthed,
    isAdmin,
    isSponsor,
    hydrate,
    login,
    register,
    logout,
    applySession,
  }
})
