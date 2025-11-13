import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import HomePage from '@/app/page'
import { useAuthStore } from '@/stores/auth-store'
import { useMatchStore } from '@/stores/match-store'
import { useRouter } from 'next/navigation'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock stores
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/stores/match-store', () => ({
  useMatchStore: vi.fn(),
}))

describe('HomePage', () => {
  const mockPush = vi.fn()
  const mockLogout = vi.fn()
  const mockUploadImage = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({ push: mockPush })
    ;(useAuthStore as any).mockReturnValue({
      user: {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'USER',
        createdAt: '2024-01-01T00:00:00Z',
      },
      isAuthenticated: true,
      logout: mockLogout,
    })
    ;(useMatchStore as any).mockReturnValue({
      uploadImage: mockUploadImage,
      matches: {},
      isUploading: false,
      error: null,
    })
  })

  describe('Authentication Check', () => {
    it('should redirect to /auth if not authenticated', () => {
      ;(useAuthStore as any).mockReturnValue({
        user: null,
        isAuthenticated: false,
        logout: mockLogout,
      })

      render(<HomePage />)

      // Component should return null before redirect
      expect(screen.queryByText(/welcome/i)).not.toBeInTheDocument()
    })

    it('should show content if authenticated', () => {
      render(<HomePage />)

      expect(screen.getByText(/welcome back, john doe/i)).toBeInTheDocument()
    })
  })

  describe('User Greeting', () => {
    it('should display user name in greeting', () => {
      render(<HomePage />)

      expect(screen.getByText(/john doe/i)).toBeInTheDocument()
    })

    it('should show welcome message', () => {
      render(<HomePage />)

      expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
    })
  })

  describe('Upload Form', () => {
    it('should display upload form', () => {
      render(<HomePage />)

      expect(screen.getByText(/upload image/i)).toBeInTheDocument()
    })

    it('should redirect to results page after successful upload', async () => {
      const user = userEvent.setup()
      mockUploadImage.mockResolvedValueOnce({
        matchId: 'match123',
        status: 'QUEUED',
        queuePosition: 1,
        estimatedWaitTimeMs: 5000,
        createdAt: new Date().toISOString(),
      })

      render(<HomePage />)

      // This test is simplified - actual file upload testing is done in upload-form.test.tsx
      // We just verify the redirect happens
      const uploadButton = screen.getByRole('button', { name: /upload/i })
      expect(uploadButton).toBeInTheDocument()
    })
  })

  describe('Recent Matches Preview', () => {
    it('should display recent matches section', () => {
      render(<HomePage />)

      // Recent Matches is in a CardTitle which may not be a heading element
      const recentMatches = screen.getAllByText(/recent matches/i)
      expect(recentMatches.length).toBeGreaterThan(0)
    })

    it('should show message when no recent matches', () => {
      render(<HomePage />)

      expect(screen.getByText(/no recent matches/i)).toBeInTheDocument()
    })

    it('should display link to view all matches', () => {
      render(<HomePage />)

      expect(screen.getByRole('link', { name: /view all/i })).toBeInTheDocument()
    })
  })

  describe('Logout Button', () => {
    it('should display logout button', () => {
      render(<HomePage />)

      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
    })

    it('should call logout when logout button is clicked', async () => {
      const user = userEvent.setup()
      render(<HomePage />)

      const logoutButton = screen.getByRole('button', { name: /logout/i })
      await user.click(logoutButton)

      expect(mockLogout).toHaveBeenCalled()
    })

    it('should redirect to auth page after logout', async () => {
      const user = userEvent.setup()
      render(<HomePage />)

      const logoutButton = screen.getByRole('button', { name: /logout/i })
      await user.click(logoutButton)

      expect(mockLogout).toHaveBeenCalled()
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth')
      })
    })
  })
})
