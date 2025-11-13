import { VideoMatchAPIClient } from '@/lib/api/client'
import { server } from '@/lib/api/mock-server'
import { http, HttpResponse } from 'msw'

describe('VideoMatchAPIClient', () => {
  let client: VideoMatchAPIClient

  // Setup MSW server
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  beforeEach(() => {
    client = new VideoMatchAPIClient('http://localhost:8080', true)
  })

  describe('uploadImage', () => {
    it('should upload image and return match ID', async () => {
      // Given
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      // When
      const result = await client.uploadImage(file)

      // Then
      expect(result.matchId).toBeDefined()
      expect(result.status).toBe('QUEUED')
      expect(result.queuePosition).toBeGreaterThanOrEqual(0)
      expect(result.estimatedWaitTimeMs).toBeGreaterThan(0)
    })

    it('should include priority in request', async () => {
      // Given
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      let requestPriority: string | null = null

      server.use(
        http.post('http://localhost:8080/api/v1/matches', async ({ request }) => {
          const formData = await request.formData()
          requestPriority = formData.get('priority') as string
          return HttpResponse.json({
            matchId: 'test-123',
            status: 'QUEUED',
            queuePosition: 1,
            estimatedWaitTimeMs: 3000,
            createdAt: new Date().toISOString(),
          })
        })
      )

      // When
      await client.uploadImage(file, 'high')

      // Then
      expect(requestPriority).toBe('high')
    })
  })

  describe('getMatchResult', () => {
    it('should fetch match result by ID', async () => {
      // Given
      const matchId = 'test-match-id'

      // When
      const result = await client.getMatchResult(matchId)

      // Then
      expect(result.matchId).toBe(matchId)
      expect(result.status).toBeDefined()
    })

    it('should return completed match with result', async () => {
      // Given
      const matchId = 'completed-match-id'

      server.use(
        http.get(`http://localhost:8080/api/v1/matches/${matchId}`, () => {
          return HttpResponse.json({
            matchId,
            status: 'COMPLETED',
            result: {
              matched: true,
              advertisement: {
                id: 'ad-123',
                brandName: 'Nike',
                campaignName: 'Test Campaign',
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
          })
        })
      )

      // When
      const result = await client.getMatchResult(matchId)

      // Then
      expect(result.status).toBe('COMPLETED')
      expect(result.result).toBeDefined()
      expect(result.result?.matched).toBe(true)
      expect(result.result?.confidence).toBe(0.95)
    })
  })

  describe('listMatches', () => {
    it('should fetch match history with pagination', async () => {
      // Given
      const page = 0
      const size = 20

      // When
      const result = await client.listMatches(page, size)

      // Then
      expect(result.content).toBeDefined()
      expect(Array.isArray(result.content)).toBe(true)
      expect(result.pageable).toBeDefined()
      expect(result.pageable.pageNumber).toBe(0)
    })
  })

  describe('login', () => {
    it('should authenticate user and return token', async () => {
      // Given
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      }

      // When
      const result = await client.login(credentials)

      // Then
      expect(result.token).toBeDefined()
      expect(result.user).toBeDefined()
      expect(result.user.email).toBe('test@example.com')
      expect(result.expiresIn).toBeGreaterThan(0)
    })
  })

  describe('listAdvertisements', () => {
    it('should fetch advertisements with pagination', async () => {
      // Given
      const page = 0
      const size = 20

      // When
      const result = await client.listAdvertisements(page, size)

      // Then
      expect(result.content).toBeDefined()
      expect(Array.isArray(result.content)).toBe(true)
      expect(result.content.length).toBeGreaterThan(0)
    })
  })

  describe('error handling', () => {
    it('should throw error on network failure', async () => {
      // Given
      server.use(
        http.get('http://localhost:8080/api/v1/matches/error-test', () => {
          return HttpResponse.error()
        })
      )

      // When/Then
      await expect(client.getMatchResult('error-test')).rejects.toThrow()
    })

    it('should throw error on 404', async () => {
      // Given
      server.use(
        http.get('http://localhost:8080/api/v1/matches/not-found', () => {
          return new HttpResponse(null, { status: 404 })
        })
      )

      // When/Then
      await expect(client.getMatchResult('not-found')).rejects.toThrow()
    })
  })
})
