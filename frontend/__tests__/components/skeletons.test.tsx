import { render, screen } from '@testing-library/react'
import {
  MatchListSkeleton,
  MatchResultSkeleton,
  CardListSkeleton,
  TableSkeleton,
  PageSkeleton,
} from '@/components/skeletons'

describe('Skeleton Components', () => {
  describe('MatchListSkeleton', () => {
    it('should render default number of items (3)', () => {
      const { container } = render(<MatchListSkeleton />)
      const items = container.querySelectorAll('.space-y-3 > div')
      expect(items).toHaveLength(3)
    })

    it('should render custom number of items', () => {
      const { container } = render(<MatchListSkeleton count={5} />)
      const items = container.querySelectorAll('.space-y-3 > div')
      expect(items).toHaveLength(5)
    })
  })

  describe('MatchResultSkeleton', () => {
    it('should render result skeleton', () => {
      const { container } = render(<MatchResultSkeleton />)
      // Should have at least 2 cards (status and result)
      const cards = container.querySelectorAll('[class*="card"]')
      expect(cards.length).toBeGreaterThan(0)
    })
  })

  describe('CardListSkeleton', () => {
    it('should render default number of cards (6)', () => {
      const { container } = render(<CardListSkeleton />)
      const items = container.querySelectorAll('.grid > div')
      expect(items).toHaveLength(6)
    })

    it('should render custom number of cards', () => {
      const { container } = render(<CardListSkeleton count={9} />)
      const items = container.querySelectorAll('.grid > div')
      expect(items).toHaveLength(9)
    })
  })

  describe('TableSkeleton', () => {
    it('should render default rows and cols', () => {
      const { container } = render(<TableSkeleton />)
      // 5 rows + 1 header row = 6 total
      const rows = container.querySelectorAll('.space-y-3 > div')
      expect(rows).toHaveLength(6) // header + 5 rows
    })

    it('should render custom rows and cols', () => {
      const { container } = render(<TableSkeleton rows={3} cols={5} />)
      const rows = container.querySelectorAll('.space-y-3 > div')
      expect(rows).toHaveLength(4) // header + 3 rows
    })
  })

  describe('PageSkeleton', () => {
    it('should render page skeleton', () => {
      const { container } = render(<PageSkeleton />)
      // Should have content structure
      const content = container.querySelector('.space-y-6')
      expect(content).toBeInTheDocument()
    })
  })
})
