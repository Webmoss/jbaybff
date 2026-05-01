export type UserRole = 'ADMIN' | 'DONOR' | 'SPONSOR'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  sponsor?: {
    id: string
    companyName: string
    logoUrl: string | null
    description: string | null
    website: string | null
  } | null
}

export interface AuthResponse {
  user: User
  access_token: string
}
