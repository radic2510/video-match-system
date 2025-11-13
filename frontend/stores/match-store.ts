import { create } from 'zustand'
import type { Match, UploadResponse } from '@/types/api'
import { apiClient } from '@/lib/api/client'

interface MatchState {
  // State
  matches: Record<string, Match>
  currentMatchId: string | null
  isUploading: boolean
  error: string | null

  // Actions
  uploadImage: (file: File, priority?: string) => Promise<UploadResponse>
  getMatch: (matchId: string) => Promise<Match>
  setCurrentMatch: (matchId: string | null) => void
  updateMatch: (match: Match) => void
  clearError: () => void
}

export const useMatchStore = create<MatchState>((set, get) => ({
  // Initial state
  matches: {},
  currentMatchId: null,
  isUploading: false,
  error: null,

  // Actions
  uploadImage: async (file: File, priority: string = 'normal') => {
    set({ isUploading: true, error: null })
    try {
      const response = await apiClient.uploadImage(file, priority)

      // Create initial match object
      const match: Match = {
        matchId: response.matchId,
        status: response.status,
        createdAt: response.createdAt,
      }

      set((state) => ({
        matches: {
          ...state.matches,
          [response.matchId]: match,
        },
        currentMatchId: response.matchId,
        isUploading: false,
      }))

      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image'
      set({ error: errorMessage, isUploading: false })
      throw error
    }
  },

  getMatch: async (matchId: string) => {
    set({ error: null })
    try {
      const match = await apiClient.getMatchResult(matchId)

      set((state) => ({
        matches: {
          ...state.matches,
          [matchId]: match,
        },
      }))

      return match
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch match'
      set({ error: errorMessage })
      throw error
    }
  },

  setCurrentMatch: (matchId: string | null) => {
    set({ currentMatchId: matchId })
  },

  updateMatch: (match: Match) => {
    set((state) => ({
      matches: {
        ...state.matches,
        [match.matchId]: match,
      },
    }))
  },

  clearError: () => {
    set({ error: null })
  },
}))
