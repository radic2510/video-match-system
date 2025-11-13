import { renderHook, act, waitFor } from '@testing-library/react'
import { useMatchStore } from '@/stores/match-store'
import { server } from '@/lib/api/mock-server'
import { http, HttpResponse } from 'msw'

describe('useMatchStore', () => {
  // Setup MSW server
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
  afterEach(() => {
    server.resetHandlers()
    // Clear store state
    useMatchStore.setState({
      matches: {},
      currentMatchId: null,
      isUploading: false,
      error: null,
    })
  })
  afterAll(() => server.close())

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      const { result } = renderHook(() => useMatchStore())
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      let uploadResponse: any

      await act(async () => {
        uploadResponse = await result.current.uploadImage(file)
      })

      await waitFor(() => {
        expect(uploadResponse.matchId).toBeDefined()
        expect(uploadResponse.status).toBe('QUEUED')
        expect(result.current.isUploading).toBe(false)
        expect(result.current.currentMatchId).toBe(uploadResponse.matchId)
        expect(result.current.matches[uploadResponse.matchId]).toBeDefined()
        expect(result.current.error).toBeNull()
      })
    })

    it('should upload with custom priority', async () => {
      const { result } = renderHook(() => useMatchStore())
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      let requestPriority: string | null = null

      server.use(
        http.post('http://localhost:8080/api/v1/matches', async ({ request }) => {
          const formData = await request.formData()
          requestPriority = formData.get('priority') as string
          return HttpResponse.json({
            matchId: 'test-123',
            status: 'QUEUED',
            queuePosition: 0,
            estimatedWaitTimeMs: 3000,
            createdAt: new Date().toISOString(),
          })
        })
      )

      await act(async () => {
        await result.current.uploadImage(file, 'high')
      })

      await waitFor(() => {
        expect(requestPriority).toBe('high')
      })
    })

    it('should handle upload error', async () => {
      server.use(
        http.post('http://localhost:8080/api/v1/matches', () => {
          return new HttpResponse(
            JSON.stringify({ message: 'Invalid image format' }),
            { status: 400 }
          )
        })
      )

      const { result } = renderHook(() => useMatchStore())
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      await act(async () => {
        try {
          await result.current.uploadImage(file)
        } catch (error) {
          // Expected error
        }
      })

      await waitFor(() => {
        expect(result.current.isUploading).toBe(false)
        expect(result.current.error).toBe('Invalid image format')
      })
    })

    it('should handle network error', async () => {
      server.use(
        http.post('http://localhost:8080/api/v1/matches', () => {
          return HttpResponse.error()
        })
      )

      const { result } = renderHook(() => useMatchStore())
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      await act(async () => {
        try {
          await result.current.uploadImage(file)
        } catch (error) {
          // Expected error
        }
      })

      await waitFor(() => {
        expect(result.current.isUploading).toBe(false)
        expect(result.current.error).toBe('Unable to connect to server')
      })
    })
  })

  describe('getMatch', () => {
    it('should fetch match result', async () => {
      const { result } = renderHook(() => useMatchStore())
      const matchId = 'test-match-id'

      let match: any

      await act(async () => {
        match = await result.current.getMatch(matchId)
      })

      await waitFor(() => {
        expect(match.matchId).toBe(matchId)
        expect(result.current.matches[matchId]).toBeDefined()
        expect(result.current.matches[matchId]).toEqual(match)
        expect(result.current.error).toBeNull()
      })
    })

    it('should handle fetch error', async () => {
      server.use(
        http.get('http://localhost:8080/api/v1/matches/not-found', () => {
          return new HttpResponse(null, { status: 404 })
        })
      )

      const { result } = renderHook(() => useMatchStore())

      await act(async () => {
        try {
          await result.current.getMatch('not-found')
        } catch (error) {
          // Expected error
        }
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Resource not found')
      })
    })
  })

  describe('setCurrentMatch', () => {
    it('should set current match ID', () => {
      const { result } = renderHook(() => useMatchStore())
      const matchId = 'test-123'

      act(() => {
        result.current.setCurrentMatch(matchId)
      })

      expect(result.current.currentMatchId).toBe(matchId)
    })

    it('should clear current match ID', () => {
      const { result } = renderHook(() => useMatchStore())

      act(() => {
        result.current.setCurrentMatch('test-123')
      })

      expect(result.current.currentMatchId).toBe('test-123')

      act(() => {
        result.current.setCurrentMatch(null)
      })

      expect(result.current.currentMatchId).toBeNull()
    })
  })

  describe('updateMatch', () => {
    it('should update match in store', async () => {
      const { result } = renderHook(() => useMatchStore())
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      // First upload
      let uploadResponse: any
      await act(async () => {
        uploadResponse = await result.current.uploadImage(file)
      })

      await waitFor(() => {
        expect(result.current.matches[uploadResponse.matchId].status).toBe('QUEUED')
      })

      // Update match with completed status
      const updatedMatch = {
        matchId: uploadResponse.matchId,
        status: 'COMPLETED' as const,
        result: {
          matched: true,
          advertisement: {
            id: 'ad-123',
            brandName: 'Nike',
            campaignName: 'Test',
          },
          confidence: 0.95,
          frameNumber: 100,
          timestamp: 5.0,
          processingTimeMs: 1200,
          verificationScores: {
            embedding: 0.92,
            sift: 0.95,
            color: 0.88,
            text: 0.91,
          },
          alternativeCandidates: [],
        },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }

      act(() => {
        result.current.updateMatch(updatedMatch)
      })

      expect(result.current.matches[uploadResponse.matchId]).toEqual(updatedMatch)
    })
  })

  describe('clearError', () => {
    it('should clear error state', async () => {
      server.use(
        http.post('http://localhost:8080/api/v1/matches', () => {
          return new HttpResponse(null, { status: 400 })
        })
      )

      const { result } = renderHook(() => useMatchStore())
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      // Generate an error
      await act(async () => {
        try {
          await result.current.uploadImage(file)
        } catch (error) {
          // Expected error
        }
      })

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })

      // Clear error
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })
})
