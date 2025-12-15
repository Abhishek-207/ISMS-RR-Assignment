import { storage } from './storage'

export interface User {
  _id: string
  name: string
  email: string
  role: 'PLATFORM_ADMIN' | 'ORG_ADMIN' | 'ORG_USER'
  organizationId: string
  organizationCategory: string
  organization: {
    _id: string
    name: string
    category: string
  }
}

export interface AuthResponse {
  token: string
  user: User
}

export const getCurrentUser = (): User | null => {
  const userStr = storage.getItem('user')
  if (!userStr) return null
  
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export const getUser = getCurrentUser

export const getToken = (): string | null => {
  return storage.getItem('token')
}

export const setAuth = (auth: AuthResponse): void => {
  storage.setItem('token', auth.token)
  storage.setItem('user', JSON.stringify(auth.user))
  
  window.dispatchEvent(new Event('auth-changed'))
}

export const clearAuth = (): void => {
  storage.removeItem('token')
  storage.removeItem('user')
  storage.removeItem('organization')
  
  window.dispatchEvent(new Event('auth-changed'))
}

export const isAuthenticated = (): boolean => {
  return !!getToken() && !!getCurrentUser()
}

export const isPlatformAdmin = (): boolean => {
  const user = getCurrentUser()
  return user?.role === 'PLATFORM_ADMIN'
}

export const isOrgAdmin = (): boolean => {
  const user = getCurrentUser()
  return user?.role === 'ORG_ADMIN'
}

export const isOrgUser = (): boolean => {
  const user = getCurrentUser()
  return user?.role === 'ORG_USER'
}

export const isAdmin = (): boolean => {
  return isPlatformAdmin() || isOrgAdmin()
}

export const canManageUsers = (): boolean => {
  return isPlatformAdmin() || isOrgAdmin()
}

export const canApproveTransfers = (): boolean => {
  return isOrgAdmin()
}

export const canCreateMaterials = (): boolean => {
  return true
}

export const canEditMaterials = (materialCreatedBy: string): boolean => {
  const user = getCurrentUser()
  if (!user) return false
  
  return user._id === materialCreatedBy || isOrgAdmin()
}

export const getOrganizationCategory = (): string | null => {
  const user = getCurrentUser()
  return user?.organizationCategory || null
}

export const getOrganizationId = (): string | null => {
  const user = getCurrentUser()
  return user?.organizationId || null
}
