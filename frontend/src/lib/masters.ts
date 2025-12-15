import { api } from './api'

export interface State {
  _id: string
  name: string
  isActive: boolean
}

export interface Site {
  _id: string
  name: string
  stateId: State
  isActive: boolean
}

export interface Project {
  _id: string
  name: string
  siteId: Site
  clientId: Client
  isActive: boolean
}

export interface Client {
  _id: string
  name: string
  stateId: State
  isActive: boolean
}

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

export const fetchStates = async (): Promise<State[]> => {
  const response = await api.get('/masters/states')
  return response.data.items
}

export const fetchSites = async (stateId?: string): Promise<Site[]> => {
  const params = stateId ? { stateId } : {}
  const response = await api.get('/masters/sites', { params })
  return response.data.items
}

export const fetchProjects = async (siteId?: string, clientId?: string): Promise<Project[]> => {
  const params: any = {}
  if (siteId) params.siteId = siteId
  if (clientId) params.clientId = clientId
  const response = await api.get('/masters/projects', { params })
  return response.data.items
}

export const fetchClients = async (stateId?: string): Promise<Client[]> => {
  const params = stateId ? { stateId } : {}
  const response = await api.get('/masters/clients', { params })
  return response.data.items
}

export const fetchMaterialCategories = async (): Promise<MaterialCategory[]> => {
  const response = await api.get('/masters/material-categories')
  return response.data.items
}

export const fetchMaterialStatuses = async (): Promise<MaterialStatus[]> => {
  const response = await api.get('/masters/material-statuses')
  return response.data.items
}

// Create functions for admin users
export const createState = async (name: string): Promise<State> => {
  const response = await api.post('/masters/states', { name })
  return response.data
}

export const createSite = async (name: string, stateId: string): Promise<Site> => {
  const response = await api.post('/masters/sites', { name, stateId })
  return response.data
}

export const createProject = async (name: string, siteId: string, clientId: string): Promise<Project> => {
  const response = await api.post('/masters/projects', { name, siteId, clientId })
  return response.data
}

export const createClient = async (name: string, stateId: string): Promise<Client> => {
  const response = await api.post('/masters/clients', { name, stateId })
  return response.data
}

export const createMaterialCategory = async (name: string): Promise<MaterialCategory> => {
  const response = await api.post('/masters/material-categories', { name })
  return response.data
}

export const createMaterialStatus = async (name: string): Promise<MaterialStatus> => {
  const response = await api.post('/masters/material-statuses', { name })
  return response.data
}
