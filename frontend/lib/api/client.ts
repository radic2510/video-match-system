import type {
  UploadResponse,
  Match,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  Advertisement,
  PageResponse,
} from '@/types/api'

export class VideoMatchAPIClient {
  private baseURL: string
  private useMock: boolean

  constructor(baseURL: string, useMock: boolean = false) {
    this.baseURL = baseURL
    this.useMock = useMock
  }

  /**
   * Upload an image for matching
   */
  async uploadImage(file: File, priority: string = 'normal'): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('priority', priority)

    const response = await fetch(`${this.baseURL}/api/v1/matches`, {
      method: 'POST',
      body: formData,
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get match result by ID
   */
  async getMatchResult(matchId: string): Promise<Match> {
    const response = await fetch(`${this.baseURL}/api/v1/matches/${matchId}`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch match result: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * List user's match history
   */
  async listMatches(page: number = 0, size: number = 20): Promise<PageResponse<Match>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    })

    const response = await fetch(`${this.baseURL}/api/v1/matches?${params}`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch matches: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${this.baseURL}/api/v1/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`)
    }

    const data = await response.json()

    // Store token in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', data.token)
    }

    return data
  }

  /**
   * Register new user
   */
  async register(userData: RegisterRequest): Promise<User> {
    const response = await fetch(`${this.baseURL}/api/v1/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Logout user
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  /**
   * List advertisements
   */
  async listAdvertisements(page: number = 0, size: number = 20): Promise<PageResponse<Advertisement>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    })

    const response = await fetch(`${this.baseURL}/api/v1/advertisements?${params}`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch advertisements: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get single advertisement
   */
  async getAdvertisement(id: string): Promise<Advertisement> {
    const response = await fetch(`${this.baseURL}/api/v1/advertisements/${id}`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch advertisement: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Upload advertisement video
   */
  async uploadAdvertisement(
    video: File,
    brandName: string,
    campaignName: string
  ): Promise<Advertisement> {
    const formData = new FormData()
    formData.append('video', video)
    formData.append('brandName', brandName)
    formData.append('campaignName', campaignName)

    const response = await fetch(`${this.baseURL}/api/v1/advertisements`, {
      method: 'POST',
      body: formData,
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to upload advertisement: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get authorization headers
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {}

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    return headers
  }
}

// Export singleton instance
export const apiClient = new VideoMatchAPIClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  process.env.NODE_ENV === 'test'
)
