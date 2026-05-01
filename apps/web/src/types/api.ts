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

export interface ShopVariant {
  id: string
  sku: string
  title: string
  optionLabel: string | null
  price: string
  compareAtPrice: string | null
  inventoryQty: number
  inventoryStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'PREORDER'
  isDefault: boolean
  isActive: boolean
}

export interface ShopProduct {
  id: string
  title: string
  slug: string
  description: string
  category: string | null
  imageUrl: string | null
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  variants: ShopVariant[]
}
