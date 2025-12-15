import axios from 'axios'
import { storage } from './storage'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Send HttpOnly auth cookie
  withCredentials: true,
})

api.interceptors.request.use(
  (config) => {
    const token = storage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.errorCode
      const isExpired = error.response?.data?.expired
      const currentPath = window.location.pathname
      
      // Don't intercept 401 errors on login/signup pages (these are expected authentication failures)
      if (currentPath === '/login' || currentPath === '/signup') {
        return Promise.reject(error)
      }
      
      // Clear storage on any 401
      storage.removeItem('token')
      storage.removeItem('user')
      
      // Show appropriate message for expired token
      if (isExpired || errorCode === 1001) { // 1001 is TOKEN_EXPIRED code
        // Set a flag to show the session expired message
        sessionStorage.setItem('sessionExpired', 'true')
      }
      
      // Redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
