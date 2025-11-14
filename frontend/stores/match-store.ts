import { create } from 'zustand'
import type { Match, UploadResponse } from '@/types/api'
import { apiClient } from '@/lib/api/client'

export interface BulkUploadResult {
  file: File
  success: boolean
  matchId?: string
  error?: string
  response?: UploadResponse
}

interface MatchState {
  // State
  matches: Record<string, Match>
  currentMatchId: string | null
  isUploading: boolean
  error: string | null
  bulkUploadResults: BulkUploadResult[]

  // Actions
  uploadImage: (file: File, priority?: string) => Promise<UploadResponse>
  uploadBulkImages: (files: File[], priority?: string, onProgress?: (completed: number, total: number) => void) => Promise<BulkUploadResult[]>
  getMatch: (matchId: string) => Promise<Match>
  setCurrentMatch: (matchId: string | null) => void
  updateMatch: (match: Match) => void
  clearError: () => void
  clearBulkUploadResults: () => void
}

export const useMatchStore = create<MatchState>((set, get) => ({
  // Initial state
  matches: {},
  currentMatchId: null,
  isUploading: false,
  error: null,
  bulkUploadResults: [],

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

  uploadBulkImages: async (files: File[], priority: string = 'normal', onProgress?: (completed: number, total: number) => void) => {
    set({ isUploading: true, error: null, bulkUploadResults: [] })
    const results: BulkUploadResult[] = []

    try {
      // Upload images sequentially to avoid overwhelming the server
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          const response = await apiClient.uploadImage(file, priority)

          // Create initial match object
          const match: Match = {
            matchId: response.matchId,
            status: response.status,
            createdAt: response.createdAt,
          }

          // Update matches state
          set((state) => ({
            matches: {
              ...state.matches,
              [response.matchId]: match,
            },
          }))

          results.push({
            file,
            success: true,
            matchId: response.matchId,
            response,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed'
          results.push({
            file,
            success: false,
            error: errorMessage,
          })
        }

        // Report progress
        if (onProgress) {
          onProgress(i + 1, files.length)
        }
      }

      set({ bulkUploadResults: results, isUploading: false })
      return results
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk upload failed'
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

  clearBulkUploadResults: () => {
    set({ bulkUploadResults: [] })
  },
}))
