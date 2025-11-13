import { create } from 'zustand'
import { VideoMatchAPIClient } from '../api/client'
import { User, RegisterRequest } from '@/types/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => void
  clearError: () => void
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'
const apiClient = new VideoMatchAPIClient(API_BASE_URL, process.env.NODE_ENV === 'test')

// Helper functions for localStorage
const loadUserFromStorage = (): User | null => {
  if (typeof window === 'undefined') return null

  try {
    const userJson = localStorage.getItem('auth_user')
    const token = localStorage.getItem('auth_token')

    if (userJson && token) {
      return JSON.parse(userJson)
    }
  } catch (error) {
    console.error('Failed to load user from localStorage:', error)
  }

  return null
}

const saveUserToStorage = (user: User, token: string): void => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem('auth_user', JSON.stringify(user))
    localStorage.setItem('auth_token', token)
  } catch (error) {
    console.error('Failed to save user to localStorage:', error)
  }
}

const clearUserFromStorage = (): void => {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_token')
  } catch (error) {
    console.error('Failed to clear user from localStorage:', error)
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUserFromStorage(),
  isAuthenticated: loadUserFromStorage() !== null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.login({ email, password })

      saveUserToStorage(response.user, response.token)

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      })

      throw error
    }
  },

  register: async (userData: RegisterRequest) => {
    set({ isLoading: true, error: null })

    try {
      // Register returns only a User, need to login after
      await apiClient.register(userData)

      // Auto-login after successful registration
      const loginResponse = await apiClient.login({
        email: userData.email,
        password: userData.password,
      })

      saveUserToStorage(loginResponse.user, loginResponse.token)

      set({
        user: loginResponse.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed'

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      })

      throw error
    }
  },

  logout: () => {
    clearUserFromStorage()

    set({
      user: null,
      isAuthenticated: false,
      error: null,
    })
  },

  clearError: () => {
    set({ error: null })
  },
}))
