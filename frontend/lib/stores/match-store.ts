import { create } from 'zustand'
import { VideoMatchAPIClient } from '../api/client'
import { Match } from '@/types/api'

interface MatchState {
  currentMatch: Match | null
  matchHistory: Match[]
  isUploading: boolean
  isLoading: boolean
  error: string | null
  uploadImage: (file: File, priority?: string) => Promise<string>
  getMatch: (matchId: string) => Promise<void>
  getHistory: (page?: number, size?: number) => Promise<void>
  clearCurrentMatch: () => void
  clearError: () => void
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'
const apiClient = new VideoMatchAPIClient(API_BASE_URL, process.env.NODE_ENV === 'test')

export const useMatchStore = create<MatchState>((set) => ({
  currentMatch: null,
  matchHistory: [],
  isUploading: false,
  isLoading: false,
  error: null,

  uploadImage: async (file: File, priority: string = 'normal') => {
    set({ isUploading: true, error: null })

    try {
      const response = await apiClient.uploadImage(file, priority)

      // Convert UploadResponse to Match format for consistency
      const match: Match = {
        matchId: response.matchId,
        status: response.status,
        createdAt: response.createdAt,
      }

      set({
        currentMatch: match,
        isUploading: false,
        error: null,
      })

      return response.matchId
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'

      set({
        isUploading: false,
        error: errorMessage,
      })

      throw error
    }
  },

  getMatch: async (matchId: string) => {
    set({ isLoading: true, error: null })

    try {
      const match = await apiClient.getMatchResult(matchId)

      set({
        currentMatch: match,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch match'

      set({
        isLoading: false,
        error: errorMessage,
      })

      throw error
    }
  },

  getHistory: async (page: number = 0, size: number = 20) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.listMatches(page, size)

      set({
        matchHistory: response.content,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch history'

      set({
        isLoading: false,
        error: errorMessage,
      })

      throw error
    }
  },

  clearCurrentMatch: () => {
    set({ currentMatch: null })
  },

  clearError: () => {
    set({ error: null })
  },
}))
