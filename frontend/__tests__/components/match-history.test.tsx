import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { MatchHistory } from '@/components/match-history'
import type { Match } from '@/types/api'

// Mock data
const mockMatches: Match[] = [
  {
    matchId: 'match1',
    userId: 'user1',
    status: 'COMPLETED',
    result: {
      matched: true,
      advertisement: {
        id: 'ad1',
        brandName: 'Brand A',
        campaignName: 'Campaign A',
      },
      confidence: 0.95,
      frameNumber: 120,
      timestamp: 4.5,
      processingTimeMs: 1200,
      verificationScores: {
        embedding: 0.96,
        sift: 0.92,
        color: 0.94,
        text: 0.97,
      },
      alternativeCandidates: [],
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 1500).toISOString(),
  },
  {
    matchId: 'match2',
    userId: 'user1',
    status: 'PROCESSING',
    progress: 60,
    currentStage: 'Feature Extraction',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
  },
  {
    matchId: 'match3',
    userId: 'user1',
    status: 'QUEUED',
    createdAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 minute ago
  },
  {
    matchId: 'match4',
    userId: 'user1',
    status: 'FAILED',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
]

describe('MatchHistory', () => {
  describe('Empty State', () => {
    it('should display empty state when no matches', () => {
      render(<MatchHistory matches={[]} isLoading={false} />)

      expect(screen.getByText(/no matches found/i)).toBeInTheDocument()
    })

    it('should display empty state message correctly', () => {
      render(<MatchHistory matches={[]} isLoading={false} />)

      expect(
        screen.getByText(/you haven't uploaded any images yet/i)
      ).toBeInTheDocument()
    })
  })

  describe('List Rendering', () => {
    it('should render all matches', () => {
      render(<MatchHistory matches={mockMatches} isLoading={false} />)

      expect(screen.getByText('match1')).toBeInTheDocument()
      expect(screen.getByText('match2')).toBeInTheDocument()
      expect(screen.getByText('match3')).toBeInTheDocument()
      expect(screen.getByText('match4')).toBeInTheDocument()
    })

    it('should display status badges for each match', () => {
      render(<MatchHistory matches={mockMatches} isLoading={false} />)

      expect(screen.getByText('COMPLETED')).toBeInTheDocument()
      expect(screen.getByText('PROCESSING')).toBeInTheDocument()
      expect(screen.getByText('QUEUED')).toBeInTheDocument()
      expect(screen.getByText('FAILED')).toBeInTheDocument()
    })

    it('should display confidence score for completed matches', () => {
      render(<MatchHistory matches={mockMatches} isLoading={false} />)

      expect(screen.getByText(/95%/i)).toBeInTheDocument()
    })

    it('should display brand name for completed matches', () => {
      render(<MatchHistory matches={mockMatches} isLoading={false} />)

      expect(screen.getByText('Brand A')).toBeInTheDocument()
    })

    it('should display relative timestamps', () => {
      render(<MatchHistory matches={mockMatches} isLoading={false} />)

      // At least one timestamp should be present
      const timestamps = screen.getAllByText(/ago/i)
      expect(timestamps.length).toBeGreaterThan(0)
    })
  })

  describe('Pagination', () => {
    const manyMatches = Array.from({ length: 25 }, (_, i) => ({
      matchId: `match${i}`,
      userId: 'user1',
      status: 'COMPLETED' as const,
      createdAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
    }))

    it('should display only 10 items per page by default', () => {
      render(<MatchHistory matches={manyMatches} isLoading={false} />)

      // Count visible match items
      const matchItems = screen.getAllByRole('button', { name: /view details/i })
      expect(matchItems).toHaveLength(10)
    })

    it('should display pagination controls when more than 10 items', () => {
      render(<MatchHistory matches={manyMatches} isLoading={false} />)

      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    })

    it('should disable previous button on first page', () => {
      render(<MatchHistory matches={manyMatches} isLoading={false} />)

      const prevButton = screen.getByRole('button', { name: /previous/i })
      expect(prevButton).toBeDisabled()
    })

    it('should navigate to next page when next button is clicked', async () => {
      const user = userEvent.setup()
      render(<MatchHistory matches={manyMatches} isLoading={false} />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      // Should show page 2 items
      expect(screen.getByText('match10')).toBeInTheDocument()
    })

    it('should navigate back to previous page', async () => {
      const user = userEvent.setup()
      render(<MatchHistory matches={manyMatches} isLoading={false} />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      const prevButton = screen.getByRole('button', { name: /previous/i })
      await user.click(prevButton)

      // Should show page 1 items again
      expect(screen.getByText('match0')).toBeInTheDocument()
    })

    it('should display current page number', () => {
      render(<MatchHistory matches={manyMatches} isLoading={false} />)

      expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument()
    })
  })

  describe('Click Handlers', () => {
    it('should call onMatchClick when match item is clicked', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(
        <MatchHistory
          matches={mockMatches}
          isLoading={false}
          onMatchClick={handleClick}
        />
      )

      const matchItem = screen.getAllByRole('button', { name: /view details/i })[0]
      await user.click(matchItem)

      expect(handleClick).toHaveBeenCalledWith('match1')
    })

    it('should call onMatchClick with correct matchId', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(
        <MatchHistory
          matches={mockMatches}
          isLoading={false}
          onMatchClick={handleClick}
        />
      )

      const matchItems = screen.getAllByRole('button', { name: /view details/i })
      await user.click(matchItems[1])

      expect(handleClick).toHaveBeenCalledWith('match2')
    })
  })

  describe('Loading State', () => {
    it('should display loading skeleton when isLoading is true', () => {
      render(<MatchHistory matches={[]} isLoading={true} />)

      // Should show skeleton loaders
      expect(screen.getAllByTestId('skeleton')).toHaveLength(3)
    })

    it('should not display matches when loading', () => {
      render(<MatchHistory matches={mockMatches} isLoading={true} />)

      // Should not show actual matches
      expect(screen.queryByText('match1')).not.toBeInTheDocument()
    })
  })

  describe('Status Badge Colors', () => {
    it('should use correct variant for COMPLETED status', () => {
      render(<MatchHistory matches={[mockMatches[0]]} isLoading={false} />)

      const badge = screen.getByText('COMPLETED').closest('[class*="bg-green"]')
      expect(badge).toHaveClass('bg-green-500')
    })

    it('should use correct variant for PROCESSING status', () => {
      render(<MatchHistory matches={[mockMatches[1]]} isLoading={false} />)

      const badge = screen.getByText('PROCESSING').closest('[class*="bg-blue"]')
      expect(badge).toHaveClass('bg-blue-500')
    })

    it('should use correct variant for QUEUED status', () => {
      render(<MatchHistory matches={[mockMatches[2]]} isLoading={false} />)

      const badge = screen.getByText('QUEUED').closest('[class*="bg-yellow"]')
      expect(badge).toHaveClass('bg-yellow-500')
    })

    it('should use correct variant for FAILED status', () => {
      render(<MatchHistory matches={[mockMatches[3]]} isLoading={false} />)

      const badge = screen.getByText('FAILED').closest('[class*="bg-red"]')
      expect(badge).toHaveClass('bg-red-500')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible list structure', () => {
      render(<MatchHistory matches={mockMatches} isLoading={false} />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    it('should have accessible buttons for match items', () => {
      render(<MatchHistory matches={mockMatches} isLoading={false} />)

      const buttons = screen.getAllByRole('button', { name: /view details/i })
      expect(buttons.length).toBeGreaterThan(0)
    })
  })
})
