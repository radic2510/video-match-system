import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MatchResultCard } from '@/components/match-result-card'
import { useMatchStore } from '@/stores/match-store'
import type { Match } from '@/types/api'

// Mock the match store
vi.mock('@/stores/match-store', () => ({
  useMatchStore: vi.fn(),
}))

describe('MatchResultCard', () => {
  const mockGetMatch = vi.fn()

  const mockMatchQueued: Match = {
    matchId: '123',
    status: 'QUEUED',
    createdAt: '2024-01-01T00:00:00Z',
  }

  const mockMatchProcessing: Match = {
    matchId: '123',
    status: 'PROCESSING',
    progress: 50,
    currentStage: 'Feature Extraction',
    createdAt: '2024-01-01T00:00:00Z',
  }

  const mockMatchCompleted: Match = {
    matchId: '123',
    status: 'COMPLETED',
    result: {
      matched: true,
      advertisement: {
        id: 'ad-456',
        brandName: 'Nike',
        campaignName: 'Just Do It 2024',
      },
      confidence: 0.95,
      frameNumber: 150,
      timestamp: 5.0,
      processingTimeMs: 850,
      verificationScores: {
        embedding: 0.96,
        sift: 0.94,
        color: 0.93,
        text: 0.85,
      },
      alternativeCandidates: [
        {
          advertisementId: 'ad-789',
          brandName: 'Adidas',
          confidence: 0.75,
        },
      ],
    },
    createdAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:00:05Z',
  }

  const mockMatchNoMatch: Match = {
    matchId: '123',
    status: 'COMPLETED',
    result: {
      matched: false,
      confidence: 0.0,
      frameNumber: 0,
      timestamp: 0,
      processingTimeMs: 500,
      verificationScores: {
        embedding: 0.45,
        sift: 0.30,
        color: 0.20,
        text: 0.10,
      },
      alternativeCandidates: [],
    },
    createdAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:00:05Z',
  }

  const mockMatchFailed: Match = {
    matchId: '123',
    status: 'FAILED',
    createdAt: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useMatchStore as any).mockReturnValue({
      matches: {},
      getMatch: mockGetMatch,
    })
  })

  describe('Loading State', () => {
    it('should show loading skeleton when match is QUEUED', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchQueued },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      // Look for the QUEUED state indicators
      expect(screen.getByText('Queued')).toBeInTheDocument()
      expect(screen.getByText(/waiting in queue/i)).toBeInTheDocument()
    })

    it('should show processing state with progress', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchProcessing },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(screen.getByText(/processing/i)).toBeInTheDocument()
      expect(screen.getByText(/feature extraction/i)).toBeInTheDocument()
      expect(screen.getByText(/50%/i)).toBeInTheDocument()
    })

    it('should show progress bar when processing', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchProcessing },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
    })
  })

  describe('Success State with Match', () => {
    it('should display matched advertisement information', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchCompleted },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(screen.getByText(/nike/i)).toBeInTheDocument()
      expect(screen.getByText(/just do it 2024/i)).toBeInTheDocument()
    })

    it('should display confidence score', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchCompleted },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(screen.getByText(/95%/i)).toBeInTheDocument()
      expect(screen.getByText(/confidence/i)).toBeInTheDocument()
    })

    it('should display confidence as progress bar', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchCompleted },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      const progressBars = screen.getAllByRole('progressbar')
      // First progressbar should be the confidence one
      expect(progressBars.some(pb => pb.getAttribute('aria-valuenow') === '95')).toBe(true)
    })

    it('should display frame number and timestamp', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchCompleted },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(screen.getByText(/frame.*number/i)).toBeInTheDocument()
      expect(screen.getByText(/150/)).toBeInTheDocument()
      expect(screen.getByText(/5\.0.*sec/i)).toBeInTheDocument()
    })

    it('should display processing time', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchCompleted },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(screen.getByText(/850.*ms/i)).toBeInTheDocument()
    })

    it('should display verification scores breakdown', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchCompleted },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(screen.getByText(/embedding/i)).toBeInTheDocument()
      expect(screen.getByText(/96%/i)).toBeInTheDocument()

      expect(screen.getByText(/sift/i)).toBeInTheDocument()
      expect(screen.getByText(/94%/i)).toBeInTheDocument()

      expect(screen.getByText(/color/i)).toBeInTheDocument()
      expect(screen.getByText(/93%/i)).toBeInTheDocument()

      expect(screen.getByText(/text/i)).toBeInTheDocument()
      expect(screen.getByText(/85%/i)).toBeInTheDocument()
    })

    it('should display alternative candidates', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchCompleted },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(screen.getByText(/alternative/i)).toBeInTheDocument()
      expect(screen.getByText(/adidas/i)).toBeInTheDocument()
      expect(screen.getByText(/75%/i)).toBeInTheDocument()
    })

    it('should show match badge', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchCompleted },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(screen.getByText('Match Found')).toBeInTheDocument()
    })
  })

  describe('No Match State', () => {
    it('should display no match message', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchNoMatch },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(screen.getByText('No Match Found')).toBeInTheDocument()
    })

    it('should still display verification scores on no match', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchNoMatch },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(screen.getByText(/embedding/i)).toBeInTheDocument()
      expect(screen.getByText(/45%/i)).toBeInTheDocument()
    })

    it('should not display alternative candidates when empty', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchNoMatch },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(screen.queryByText(/alternative/i)).not.toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should display error message for FAILED status', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchFailed },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(screen.getByText('Failed')).toBeInTheDocument()
      expect(screen.getByText(/an error occurred/i)).toBeInTheDocument()
    })

    it('should display error badge', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchFailed },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(screen.getByText('Error')).toBeInTheDocument()
    })
  })

  describe('Props: matchId', () => {
    it('should fetch match data when matchId is provided', async () => {
      mockGetMatch.mockResolvedValue(mockMatchCompleted)
      ;(useMatchStore as any).mockReturnValue({
        matches: {},
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      await waitFor(() => {
        expect(mockGetMatch).toHaveBeenCalledWith('123')
      })
    })

    it('should not fetch if match already exists in store', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchCompleted },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(mockGetMatch).not.toHaveBeenCalled()
    })
  })

  describe('Props: match object', () => {
    it('should accept match object directly', () => {
      render(<MatchResultCard match={mockMatchCompleted} />)

      expect(screen.getByText(/nike/i)).toBeInTheDocument()
      expect(mockGetMatch).not.toHaveBeenCalled()
    })

    it('should prioritize match prop over matchId', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchQueued },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" match={mockMatchCompleted} />)

      expect(screen.getByText(/nike/i)).toBeInTheDocument()
      expect(screen.queryByText(/queued/i)).not.toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should render without layout errors', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchCompleted },
        getMatch: mockGetMatch,
      })

      const { container } = render(<MatchResultCard matchId="123" />)
      expect(container).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for progress bars', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchProcessing },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-label')
    })

    it('should use semantic HTML', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchCompleted },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      // Should have heading with match found
      expect(screen.getAllByRole('heading').length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing match data gracefully', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: {},
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="999" />)

      expect(screen.getByText(/loading|fetching/i)).toBeInTheDocument()
    })

    it('should handle match without result', () => {
      const matchWithoutResult: Match = {
        matchId: '123',
        status: 'COMPLETED',
        createdAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T00:00:05Z',
      }

      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': matchWithoutResult },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(screen.getByText('No Result')).toBeInTheDocument()
    })

    it('should handle match with low confidence scores', () => {
      const lowConfidenceMatch: Match = {
        ...mockMatchCompleted,
        result: {
          ...mockMatchCompleted.result!,
          confidence: 0.55,
        },
      }

      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': lowConfidenceMatch },
        getMatch: mockGetMatch,
      })

      render(<MatchResultCard matchId="123" />)

      expect(screen.getByText(/55%/i)).toBeInTheDocument()
    })
  })

  describe('Visual Indicators', () => {
    it('should use different headings for different states', () => {
      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchCompleted },
        getMatch: mockGetMatch,
      })

      const { rerender } = render(<MatchResultCard matchId="123" />)
      expect(screen.getByText('Match Found')).toBeInTheDocument()

      ;(useMatchStore as any).mockReturnValue({
        matches: { '123': mockMatchFailed },
        getMatch: mockGetMatch,
      })

      rerender(<MatchResultCard matchId="123" />)
      expect(screen.getByText('Failed')).toBeInTheDocument()
    })
  })
})
