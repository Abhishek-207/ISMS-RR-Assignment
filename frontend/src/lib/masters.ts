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

export const fetchMaterialCategories = async (): Promise<MaterialCategory[]> => {
  const response = await api.get('/masters/material-categories')
  return response.data.items
}

export const fetchMaterialStatuses = async (): Promise<MaterialStatus[]> => {
  const response = await api.get('/masters/material-statuses')
  return response.data.items
}

export const createMaterialCategory = async (name: string): Promise<MaterialCategory> => {
  const response = await api.post('/masters/material-categories', { name })
  return response.data
}

export const createMaterialStatus = async (name: string): Promise<MaterialStatus> => {
  const response = await api.post('/masters/material-statuses', { name })
  return response.data
}
