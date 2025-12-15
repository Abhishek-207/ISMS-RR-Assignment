import { api } from './api'

export interface MaterialCategory {
  _id: string
  name: string
  isActive: boolean
}

export interface MaterialStatus {
  _id: string
  name: string
  isActive: boolean
}

export const fetchMaterialCategories = async (options: { includeInactive?: boolean } = {}): Promise<MaterialCategory[]> => {
  const response = await api.get('/masters/material-categories', {
    params: options.includeInactive ? { includeInactive: 'true' } : undefined,
  })
  // Backend returns a paginated response in the shape:
  // { message, data: [...], meta: { page, pageSize, total, totalPages } }
  // so we need to read from `response.data.data` instead of `items`.
  return Array.isArray(response.data?.data) ? response.data.data : []
}

export const fetchMaterialStatuses = async (options: { includeInactive?: boolean } = {}): Promise<MaterialStatus[]> => {
  const response = await api.get('/masters/material-statuses', {
    params: options.includeInactive ? { includeInactive: 'true' } : undefined,
  })
  return Array.isArray(response.data?.data) ? response.data.data : []
}

export const createMaterialCategory = async (name: string): Promise<MaterialCategory> => {
  const response = await api.post('/masters/material-categories', { name })
  return response.data
}

export const createMaterialStatus = async (name: string): Promise<MaterialStatus> => {
  const response = await api.post('/masters/material-statuses', { name })
  return response.data
}
