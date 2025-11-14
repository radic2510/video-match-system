'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { MatchHistory } from '@/components/match-history'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { Match, PageResponse } from '@/types/api'

const ITEMS_PER_PAGE = 20

export default function HistoryPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth')
    }
  }, [isAuthenticated, router])

  // Fetch matches from API
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchMatches = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response: PageResponse<Match> = await apiClient.listMatches(currentPage, ITEMS_PER_PAGE)
        setMatches(response.content)
        setTotalPages(response.pageable.totalPages)
        setTotalElements(response.pageable.totalElements)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch match history'
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMatches()
  }, [isAuthenticated, currentPage])

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
  }

  const handleMatchClick = (matchId: string) => {
    router.push(`/results/${matchId}`)
  }

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Match History</h1>
            <p className="text-sm text-muted-foreground">
              View all your image matching results
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="max-w-5xl mx-auto">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardHeader>
                <CardTitle>Match History</CardTitle>
                <CardDescription>Loading your matches...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && !error && matches.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Match History</CardTitle>
                <CardDescription>Your image matching results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg mb-2">No matches found</p>
                  <p className="text-muted-foreground text-sm mb-6">
                    You haven't uploaded any images yet.
                  </p>
                  <Link href="/">
                    <Button>Upload Your First Image</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Match List */}
          {!isLoading && !error && matches.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Match History</CardTitle>
                    <CardDescription>
                      {totalElements} total {totalElements === 1 ? 'match' : 'matches'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Match List */}
                <div className="space-y-3">
                  {matches.map((match) => (
                    <button
                      key={match.matchId}
                      onClick={() => handleMatchClick(match.matchId)}
                      className="w-full text-left p-4 rounded-lg border hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <div className="space-y-2">
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">
                              {match.matchId}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                match.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : match.status === 'PROCESSING'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  : match.status === 'QUEUED'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}
                            >
                              {match.status}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(match.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {/* Details Row */}
                        {match.status === 'COMPLETED' && match.result && (
                          <div className="flex items-center gap-4 text-sm">
                            {match.result.matched && match.result.advertisement && (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Brand:</span>
                                  <span className="font-medium">
                                    {match.result.advertisement.brandName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Campaign:</span>
                                  <span className="font-medium">
                                    {match.result.advertisement.campaignName}
                                  </span>
                                </div>
                              </>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Confidence:</span>
                              <span className="font-medium">
                                {(match.result.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )}

                        {match.status === 'PROCESSING' && match.currentStage && (
                          <div className="text-sm text-muted-foreground">
                            Stage: {match.currentStage}
                            {match.progress !== undefined && ` (${match.progress}%)`}
                          </div>
                        )}

                        {match.status === 'FAILED' && (
                          <div className="text-sm text-red-500">
                            Processing failed. Click to view details.
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage + 1} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
