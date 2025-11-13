import { renderHook, act, waitFor } from '@testing-library/react'
import { useMatchStore } from '@/lib/stores/match-store'
import { server } from '@/lib/api/mock-server'
import { http, HttpResponse } from 'msw'

describe('useMatchStore', () => {
  // Setup MSW server
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

  beforeEach(() => {
    // Clear any stored state
    const { result } = renderHook(() => useMatchStore())
    act(() => {
      result.current.clearCurrentMatch()
    })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => server.close())

  describe('initial state', () => {
    it('should have no current match and empty history initially', () => {
      // Given & When
      const { result } = renderHook(() => useMatchStore())

      // Then
      expect(result.current.currentMatch).toBeNull()
      expect(result.current.matchHistory).toEqual([])
      expect(result.current.isUploading).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('uploadImage', () => {
    it('should upload image and set current match', async () => {
      // Given
      const { result } = renderHook(() => useMatchStore())
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      // When
      let matchId: string | null = null
      await act(async () => {
        matchId = await result.current.uploadImage(file, 'normal')
      })

      // Then
      await waitFor(() => {
        expect(result.current.isUploading).toBe(false)
      })
      expect(matchId).toBeTruthy()
      expect(result.current.currentMatch).toBeDefined()
      expect(result.current.currentMatch?.matchId).toBe(matchId)
      expect(result.current.currentMatch?.status).toBe('QUEUED')
      expect(result.current.error).toBeNull()
    })

    it('should set uploading state during upload', async () => {
      // Given
      const { result } = renderHook(() => useMatchStore())
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      // When
      act(() => {
        result.current.uploadImage(file, 'normal')
      })

      // Then
      expect(result.current.isUploading).toBe(true)
    })

    it('should support different priority levels', async () => {
      // Given
      const { result } = renderHook(() => useMatchStore())
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      // When
      let matchId: string | null = null
      await act(async () => {
        matchId = await result.current.uploadImage(file, 'high')
      })

      // Then
      await waitFor(() => {
        expect(result.current.isUploading).toBe(false)
      })
      expect(matchId).toBeTruthy()
      expect(result.current.currentMatch).toBeDefined()
    })
  })

  describe('getMatch', () => {
    it('should fetch match by ID', async () => {
      // Given
      const { result } = renderHook(() => useMatchStore())
      const testMatchId = 'test-match-123'

      // When
      await act(async () => {
        await result.current.getMatch(testMatchId)
      })

      // Then
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.currentMatch).toBeDefined()
      expect(result.current.currentMatch?.matchId).toBe(testMatchId)
      expect(result.current.error).toBeNull()
    })

    it('should set loading state during fetch', async () => {
      // Given
      const { result } = renderHook(() => useMatchStore())

      // When
      act(() => {
        result.current.getMatch('test-match-123')
      })

      // Then
      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('getHistory', () => {
    it('should fetch match history', async () => {
      // Given
      const { result } = renderHook(() => useMatchStore())

      // When
      await act(async () => {
        await result.current.getHistory()
      })

      // Then
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.matchHistory).toBeDefined()
      expect(Array.isArray(result.current.matchHistory)).toBe(true)
      expect(result.current.matchHistory.length).toBeGreaterThan(0)
      expect(result.current.error).toBeNull()
    })

    it('should support pagination', async () => {
      // Given
      const { result } = renderHook(() => useMatchStore())

      // When
      await act(async () => {
        await result.current.getHistory(0, 10)
      })

      // Then
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.matchHistory.length).toBeLessThanOrEqual(10)
    })
  })

  describe('clearCurrentMatch', () => {
    it('should clear current match', async () => {
      // Given
      const { result } = renderHook(() => useMatchStore())
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      await act(async () => {
        await result.current.uploadImage(file, 'normal')
      })
      await waitFor(() => expect(result.current.currentMatch).toBeDefined())

      // When
      act(() => {
        result.current.clearCurrentMatch()
      })

      // Then
      expect(result.current.currentMatch).toBeNull()
    })
  })

  describe('clearError', () => {
    it('should clear error state', () => {
      // Given
      const { result } = renderHook(() => useMatchStore())

      // When
      act(() => {
        result.current.clearError()
      })

      // Then
      expect(result.current.error).toBeNull()
    })
  })
})
