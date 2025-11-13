'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Match } from '@/types/api'
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle } from 'lucide-react'

interface MatchHistoryProps {
  matches: Match[]
  isLoading?: boolean
  onMatchClick?: (matchId: string) => void
  itemsPerPage?: number
}

export function MatchHistory({
  matches,
  isLoading = false,
  onMatchClick,
  itemsPerPage = 10,
}: MatchHistoryProps) {
  const [currentPage, setCurrentPage] = useState(0)

  const totalPages = Math.ceil(matches.length / itemsPerPage)
  const startIndex = currentPage * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMatches = matches.slice(startIndex, endIndex)

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
  }

  const getStatusVariant = (status: Match['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500 hover:bg-green-600'
      case 'PROCESSING':
        return 'bg-blue-500 hover:bg-blue-600'
      case 'QUEUED':
        return 'bg-yellow-500 hover:bg-yellow-600'
      case 'FAILED':
        return 'bg-red-500 hover:bg-red-600'
      default:
        return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  const getStatusIcon = (status: Match['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4" />
      case 'PROCESSING':
      case 'QUEUED':
        return <Clock className="h-4 w-4" />
      case 'FAILED':
        return <XCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match History</CardTitle>
          <CardDescription>Your recent image match results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2" data-testid="skeleton">
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match History</CardTitle>
          <CardDescription>Your recent image match results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-2">No matches found</p>
            <p className="text-muted-foreground text-sm">
              You haven't uploaded any images yet. Upload an image to get started!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Match History</CardTitle>
        <CardDescription>Your recent image match results</CardDescription>
      </CardHeader>
      <CardContent>
        <ul role="list" className="space-y-4">
          {currentMatches.map((match) => (
            <li key={match.matchId}>
              <Button
                variant="outline"
                className="w-full h-auto p-4 justify-start text-left hover:bg-accent"
                onClick={() => onMatchClick?.(match.matchId)}
                aria-label={`View details for ${match.matchId}`}
              >
                <div className="w-full space-y-2">
                  {/* Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {match.matchId}
                      </span>
                      <Badge className={`${getStatusVariant(match.status)} text-white`}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(match.status)}
                          {match.status}
                        </span>
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(match.createdAt)}
                    </span>
                  </div>

                  {/* Details Row */}
                  {match.status === 'COMPLETED' && match.result && (
                    <div className="flex items-center gap-4 text-sm">
                      {match.result.matched && match.result.advertisement && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Brand:</span>
                          <span className="font-medium">
                            {match.result.advertisement.brandName}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className="font-medium">
                          {(match.result.confidence * 100).toFixed(0)}%
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
              </Button>
            </li>
          ))}
        </ul>

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
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages - 1}
                aria-label="Next page"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
