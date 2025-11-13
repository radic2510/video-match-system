import { http, HttpResponse } from 'msw'
import type {
  UploadResponse,
  Match,
  Advertisement,
  LoginResponse,
  User,
  PageResponse
} from '@/types/api'

const BASE_URL = 'http://localhost:8080/api/v1'

export const handlers = [
  // User registration
  http.post(`${BASE_URL}/users/register`, async () => {
    return HttpResponse.json<User>({
      id: crypto.randomUUID(),
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      createdAt: new Date().toISOString(),
    })
  }),

  // User login
  http.post(`${BASE_URL}/users/login`, async () => {
    return HttpResponse.json<LoginResponse>({
      token: 'mock-jwt-token-' + crypto.randomUUID(),
      expiresIn: 3600,
      user: {
        id: crypto.randomUUID(),
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date().toISOString(),
      },
    })
  }),

  // Match creation (image upload)
  http.post(`${BASE_URL}/matches`, async () => {
    await new Promise(resolve => setTimeout(resolve, 500))

    return HttpResponse.json<UploadResponse>({
      matchId: crypto.randomUUID(),
      status: 'QUEUED',
      queuePosition: Math.floor(Math.random() * 5),
      estimatedWaitTimeMs: 3000 + Math.random() * 2000,
      createdAt: new Date().toISOString(),
    })
  }),

  // Get match result
  http.get(`${BASE_URL}/matches/:id`, async ({ params }) => {
    const { id } = params

    // Simulate different statuses
    const statuses = ['PROCESSING', 'COMPLETED'] as const
    const status = statuses[Math.floor(Math.random() * statuses.length)]

    if (status === 'PROCESSING') {
      return HttpResponse.json<Match>({
        matchId: id as string,
        status: 'PROCESSING',
        progress: Math.floor(Math.random() * 100),
        currentStage: 'EMBEDDING_EXTRACTION',
        createdAt: new Date().toISOString(),
      })
    }

    return HttpResponse.json<Match>({
      matchId: id as string,
      status: 'COMPLETED',
      result: {
        matched: true,
        advertisement: {
          id: crypto.randomUUID(),
          brandName: 'Nike',
          campaignName: 'Just Do It 2025',
        },
        confidence: 0.92 + Math.random() * 0.08,
        frameNumber: Math.floor(Math.random() * 500),
        timestamp: Math.random() * 15,
        processingTimeMs: 1000 + Math.random() * 500,
        verificationScores: {
          embedding: 0.90 + Math.random() * 0.10,
          sift: 0.88 + Math.random() * 0.12,
          color: 0.85 + Math.random() * 0.15,
          text: 0.87 + Math.random() * 0.13,
        },
        alternativeCandidates: [
          {
            advertisementId: crypto.randomUUID(),
            brandName: 'Adidas',
            confidence: 0.70 + Math.random() * 0.15,
          },
        ],
      },
      createdAt: new Date(Date.now() - 2000).toISOString(),
      completedAt: new Date().toISOString(),
    })
  }),

  // List matches
  http.get(`${BASE_URL}/matches`, async () => {
    const mockMatches: Match[] = Array.from({ length: 5 }, (_, i) => ({
      matchId: crypto.randomUUID(),
      status: 'COMPLETED',
      result: {
        matched: true,
        advertisement: {
          id: crypto.randomUUID(),
          brandName: ['Nike', 'Adidas', 'Samsung', 'Apple'][i % 4],
          campaignName: 'Campaign ' + (i + 1),
        },
        confidence: 0.85 + Math.random() * 0.15,
        frameNumber: Math.floor(Math.random() * 500),
        timestamp: Math.random() * 15,
        processingTimeMs: 1000 + Math.random() * 500,
        verificationScores: {
          embedding: 0.90,
          sift: 0.88,
          color: 0.85,
          text: 0.87,
        },
        alternativeCandidates: [],
      },
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      completedAt: new Date(Date.now() - i * 3600000 + 1500).toISOString(),
    }))

    return HttpResponse.json<PageResponse<Match>>({
      content: mockMatches,
      pageable: {
        pageNumber: 0,
        pageSize: 20,
        totalElements: mockMatches.length,
        totalPages: 1,
      },
    })
  }),

  // List advertisements
  http.get(`${BASE_URL}/advertisements`, async () => {
    const mockAds: Advertisement[] = Array.from({ length: 10 }, (_, i) => ({
      id: crypto.randomUUID(),
      videoPath: `/data/videos/ad-${i}.mp4`,
      brandName: ['Nike', 'Adidas', 'Samsung', 'Apple', 'Coca-Cola'][i % 5],
      campaignName: 'Campaign ' + (i + 1),
      status: 'READY',
      frameCount: 400 + Math.floor(Math.random() * 200),
      metadata: {
        duration: 15.0 + Math.random() * 15,
        resolution: '1920x1080',
        dominantColors: [
          { color: '#FF5733', percentage: 0.35 },
          { color: '#000000', percentage: 0.25 },
        ],
        textRegions: [
          { text: 'Sample Text', confidence: 0.98 },
        ],
      },
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      processedAt: new Date(Date.now() - i * 86400000 + 120000).toISOString(),
    }))

    return HttpResponse.json<PageResponse<Advertisement>>({
      content: mockAds,
      pageable: {
        pageNumber: 0,
        pageSize: 20,
        totalElements: mockAds.length,
        totalPages: 1,
      },
    })
  }),

  // Get single advertisement
  http.get(`${BASE_URL}/advertisements/:id`, async ({ params }) => {
    const { id } = params

    return HttpResponse.json<Advertisement>({
      id: id as string,
      videoPath: '/data/videos/ad-1.mp4',
      brandName: 'Nike',
      campaignName: 'Just Do It 2025',
      status: 'READY',
      frameCount: 450,
      metadata: {
        duration: 15.0,
        resolution: '1920x1080',
        dominantColors: [
          { color: '#FF5733', percentage: 0.35 },
          { color: '#000000', percentage: 0.25 },
        ],
        textRegions: [
          { text: 'Just Do It', confidence: 0.98 },
        ],
      },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      processedAt: new Date(Date.now() - 86400000 + 120000).toISOString(),
    })
  }),

  // Upload advertisement
  http.post(`${BASE_URL}/advertisements`, async () => {
    return HttpResponse.json<Advertisement>({
      id: crypto.randomUUID(),
      videoPath: '/data/videos/' + crypto.randomUUID() + '.mp4',
      brandName: 'New Brand',
      campaignName: 'New Campaign',
      status: 'PROCESSING',
      frameCount: null,
      createdAt: new Date().toISOString(),
    })
  }),
]
