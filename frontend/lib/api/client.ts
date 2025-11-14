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

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class VideoMatchAPIClient {
  private baseURL: string
  private useMock: boolean
  private isDevelopment: boolean

  constructor(baseURL: string, useMock: boolean = false) {
    this.baseURL = baseURL
    this.useMock = useMock
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  /**
   * Upload an image for matching
   */
  async uploadImage(file: File, priority: string = 'normal'): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('priority', priority)

    return this.fetch<UploadResponse>('/api/matches', {
      method: 'POST',
      body: formData,
      headers: this.getAuthHeaders(),
    })
  }

  /**
   * Get match result by ID
   */
  async getMatchResult(matchId: string): Promise<Match> {
    return this.fetch<Match>(`/api/matches/${matchId}`, {
      headers: this.getAuthHeaders(),
    })
  }

  /**
   * List user's match history
   */
  async listMatches(page: number = 0, size: number = 20): Promise<PageResponse<Match>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    })

    return this.fetch<PageResponse<Match>>(`/api/matches?${params}`, {
      headers: this.getAuthHeaders(),
    })
  }

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const data = await this.fetch<LoginResponse>('/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

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
    return this.fetch<User>('/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })
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

    return this.fetch<PageResponse<Advertisement>>(`/api/advertisements?${params}`, {
      headers: this.getAuthHeaders(),
    })
  }

  /**
   * Get single advertisement
   */
  async getAdvertisement(id: string): Promise<Advertisement> {
    return this.fetch<Advertisement>(`/api/advertisements/${id}`, {
      headers: this.getAuthHeaders(),
    })
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

    return this.fetch<Advertisement>('/api/advertisements', {
      method: 'POST',
      body: formData,
      headers: this.getAuthHeaders(),
    })
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

  /**
   * Handle API response and errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Handle successful responses
    if (response.ok) {
      return response.json()
    }

    // Handle error responses
    let errorMessage: string
    let errorDetails: any = null

    // Try to extract error message from response body
    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorData.error || this.getDefaultErrorMessage(response.status)
      errorDetails = errorData
    } catch {
      // If response body is not JSON, use default message
      errorMessage = this.getDefaultErrorMessage(response.status)
    }

    throw new APIError(errorMessage, response.status, errorDetails)
  }

  /**
   * Get default error message for status code
   */
  private getDefaultErrorMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid request'
      case 401:
        return 'Authentication required'
      case 403:
        return 'Access denied'
      case 404:
        return 'Resource not found'
      case 408:
        return 'Request timed out'
      case 429:
        return 'Too many requests'
      case 500:
        return 'Server error, please try again'
      case 502:
        return 'Bad gateway'
      case 503:
        return 'Service unavailable'
      case 504:
        return 'Gateway timeout'
      default:
        return `Request failed with status ${status}`
    }
  }

  /**
   * Perform fetch request with error handling and logging
   */
  private async fetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const fullUrl = `${this.baseURL}${url}`

    // Log request in development
    if (this.isDevelopment && typeof window !== 'undefined') {
      console.log(`[API] ${options.method || 'GET'} ${url}`)
    }

    try {
      const response = await fetch(fullUrl, options)
      return this.handleResponse<T>(response)
    } catch (error) {
      // Handle network errors
      if (error instanceof APIError) {
        throw error
      }

      // Log error in development
      if (this.isDevelopment && typeof window !== 'undefined') {
        console.error('[API] Network error:', error)
      }

      throw new APIError('Unable to connect to server')
    }
  }
}

/**
 * Create API client instance
 * Use environment-based configuration
 * MSW is only used in test environment
 */
function createAPIClient(): VideoMatchAPIClient {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  const useMock = process.env.NODE_ENV === 'test'

  return new VideoMatchAPIClient(baseURL, useMock)
}

// Export singleton instance
export const apiClient = createAPIClient()
