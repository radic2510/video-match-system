'use client'

import { useEffect } from 'react'
import { useMatchStore } from '@/stores/match-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import type { Match } from '@/types/api'

interface MatchResultCardProps {
  matchId?: string
  match?: Match
}

export function MatchResultCard({ matchId, match: matchProp }: MatchResultCardProps) {
  const { matches, getMatch } = useMatchStore()

  // Use provided match prop or fetch from store
  const match = matchProp || (matchId ? matches[matchId] : null)

  useEffect(() => {
    // Fetch match if matchId provided and not in store and no match prop
    if (matchId && !matchProp && !matches[matchId]) {
      getMatch(matchId)
    }
  }, [matchId, matchProp, matches, getMatch])

  // Loading state
  if (!match) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <p className="text-sm text-muted-foreground mt-4">Loading or fetching match data...</p>
        </CardContent>
      </Card>
    )
  }

  // Queued state
  if (match.status === 'QUEUED') {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Queued
            </CardTitle>
            <Badge variant="secondary">Waiting</Badge>
          </div>
          <CardDescription>
            Your image is queued for processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Waiting in queue...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Processing state
  if (match.status === 'PROCESSING') {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing
            </CardTitle>
            <Badge>In Progress</Badge>
          </div>
          <CardDescription>
            {match.currentStage || 'Analyzing your image...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">
                  {match.progress || 0}%
                </span>
              </div>
              <Progress
                value={match.progress || 0}
                aria-label="Processing progress"
                aria-valuenow={match.progress || 0}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Failed state
  if (match.status === 'FAILED') {
    return (
      <Card className="w-full border-destructive">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Failed
            </CardTitle>
            <Badge variant="destructive">Error</Badge>
          </div>
          <CardDescription>
            An error occurred while processing your image
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Please try uploading the image again. If the problem persists, contact support.
          </div>
        </CardContent>
      </Card>
    )
  }

  // Completed state - but no result
  if (match.status === 'COMPLETED' && !match.result) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>No Result</CardTitle>
          <CardDescription>
            Processing completed but no result was generated
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Completed state with result
  const result = match.result!

  // No match found
  if (!result.matched) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              No Match Found
            </CardTitle>
            <Badge variant="secondary">No Match</Badge>
          </div>
          <CardDescription>
            No matching advertisement was found in our database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Processing time */}
            <div className="text-sm text-muted-foreground">
              Processed in {result.processingTimeMs} ms
            </div>

            {/* Verification Scores */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Verification Scores</h4>
              <div className="space-y-3">
                {Object.entries(result.verificationScores).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm capitalize">{key}</span>
                      <span className="text-sm font-medium">
                        {Math.round(value * 100)}%
                      </span>
                    </div>
                    <Progress value={value * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Match found
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2" role="heading">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Match Found
          </CardTitle>
          <Badge className="bg-green-600 hover:bg-green-700">Matched</Badge>
        </div>
        <CardDescription>
          Successfully matched with an advertisement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Advertisement Info */}
          <div className="space-y-2">
            <div>
              <h3 className="text-lg font-semibold">{result.advertisement?.brandName}</h3>
              <p className="text-sm text-muted-foreground">
                {result.advertisement?.campaignName}
              </p>
            </div>
          </div>

          {/* Confidence Score */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Confidence</span>
              <span className="text-lg font-bold text-green-600">
                {Math.round(result.confidence * 100)}%
              </span>
            </div>
            <Progress
              value={result.confidence * 100}
              className="h-3"
              role="progressbar"
              aria-valuenow={Math.round(result.confidence * 100)}
              aria-label="Match confidence"
            />
          </div>

          {/* Frame Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Frame Number:</span>
              <span className="ml-2 font-medium">{result.frameNumber}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Timestamp:</span>
              <span className="ml-2 font-medium">{result.timestamp.toFixed(1)} sec</span>
            </div>
            <div>
              <span className="text-muted-foreground">Processing Time:</span>
              <span className="ml-2 font-medium">{result.processingTimeMs} ms</span>
            </div>
          </div>

          {/* Verification Scores */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Verification Scores</h4>
            <div className="space-y-3">
              {Object.entries(result.verificationScores).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm capitalize">{key}</span>
                    <span className="text-sm font-medium">
                      {Math.round(value * 100)}%
                    </span>
                  </div>
                  <Progress value={value * 100} className="h-2" />
                </div>
              ))}
            </div>
          </div>

          {/* Alternative Candidates */}
          {result.alternativeCandidates && result.alternativeCandidates.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Alternative Candidates</h4>
              <div className="space-y-2">
                {result.alternativeCandidates.map((candidate, index) => (
                  <div
                    key={candidate.advertisementId || index}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <span className="text-sm">{candidate.brandName}</span>
                    <Badge variant="outline">
                      {Math.round(candidate.confidence * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
