'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMatchStore } from '@/stores/match-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Home,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  TrendingUp,
  Image as ImageIcon,
  Film
} from 'lucide-react'
import type { Match } from '@/types/api'

interface PageProps {
  params: {
    matchId: string
  }
}

export default function MatchResultPage({ params }: PageProps) {
  const router = useRouter()
  const { getMatch, matches } = useMatchStore()
  const [error, setError] = useState<string | null>(null)

  const matchId = params.matchId
  const match = matches[matchId]

  // Fetch match data
  const fetchMatch = async () => {
    try {
      setError(null)
      await getMatch(matchId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch match result')
    }
  }

  // Initial fetch and polling setup
  useEffect(() => {
    // Always fetch on mount to get fresh data
    fetchMatch()

    // Set up polling for pending/processing matches
    const interval = setInterval(() => {
      const currentMatch = matches[matchId]
      if (currentMatch && (currentMatch.status === 'QUEUED' || currentMatch.status === 'PROCESSING')) {
        fetchMatch()
      }
    }, 3000) // Poll every 3 seconds

    // Cleanup
    return () => {
      clearInterval(interval)
    }
  }, [matchId])

  // Get status badge variant
  const getStatusBadge = (status: Match['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>
      case 'FAILED':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>
      case 'PROCESSING':
        return <Badge className="bg-blue-500"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Processing</Badge>
      case 'QUEUED':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Queued</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Loading state - only show if match doesn't exist yet
  const loading = !match && !error

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading match result...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state - match not found
  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <h1 className="text-xl font-bold">Video Match System</h1>
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </header>
        <main className="container py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error || 'Match not found'}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  // At this point, match is guaranteed to exist
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-xl font-bold">Video Match System</h1>
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Match Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle>Match Result</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    ID: {match.matchId}
                  </CardDescription>
                </div>
                {getStatusBadge(match.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress indicator for processing */}
              {(match.status === 'QUEUED' || match.status === 'PROCESSING') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {match.currentStage || 'Processing...'}
                    </span>
                    {match.progress !== undefined && (
                      <span className="font-medium">{match.progress}%</span>
                    )}
                  </div>
                  <Progress value={match.progress || 0} />
                  <p className="text-xs text-muted-foreground">
                    Checking for updates every 3 seconds...
                  </p>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created At:</span>
                  <span className="font-medium">
                    {new Date(match.createdAt).toLocaleString()}
                  </span>
                </div>
                {match.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed At:</span>
                    <span className="font-medium">
                      {new Date(match.completedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Match Results - Only show when completed */}
          {match.status === 'COMPLETED' && match.result && (
            <>
              {/* Main Match Result */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {match.result.matched ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Match Found
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-orange-500" />
                        No Match Found
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {match.result.matched && match.result.advertisement && (
                    <>
                      {/* Advertisement Info */}
                      <div className="grid gap-3 p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Film className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-lg">
                            {match.result.advertisement.brandName}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Campaign:</p>
                          <p className="font-medium">{match.result.advertisement.campaignName}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Advertisement ID:</p>
                          <p className="font-mono text-xs">{match.result.advertisement.id}</p>
                        </div>
                      </div>

                      {/* Confidence Score */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Confidence Score</span>
                          </div>
                          <span className="text-2xl font-bold text-primary">
                            {(match.result.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={match.result.confidence * 100} />
                      </div>

                      {/* Frame and Timestamp Info */}
                      <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Frame Number</p>
                          <p className="text-lg font-semibold">{match.result.frameNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Timestamp</p>
                          <p className="text-lg font-semibold">
                            {(match.result.timestamp / 1000).toFixed(2)}s
                          </p>
                        </div>
                      </div>

                      {/* Verification Scores */}
                      {match.result.verificationScores && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-sm">Verification Scores</h3>
                          <div className="grid gap-2">
                            {Object.entries(match.result.verificationScores).map(([key, value]) => (
                              <div key={key} className="flex items-center justify-between text-sm">
                                <span className="capitalize text-muted-foreground">{key}:</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={value * 100} className="w-24 h-1.5" />
                                  <span className="font-medium w-12 text-right">
                                    {(value * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Processing Time */}
                      <div className="text-sm text-muted-foreground">
                        Processing Time: <span className="font-medium">
                          {match.result.processingTimeMs}ms
                        </span>
                      </div>
                    </>
                  )}

                  {!match.result.matched && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No Match Found</AlertTitle>
                      <AlertDescription>
                        The system could not find a matching advertisement for the uploaded image.
                        This could be because the advertisement is not in our database or the image quality was insufficient.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Alternative Candidates */}
              {match.result.alternativeCandidates && match.result.alternativeCandidates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Alternative Candidates</CardTitle>
                    <CardDescription>
                      Other possible matches with lower confidence scores
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {match.result.alternativeCandidates.map((candidate, index) => (
                        <div
                          key={candidate.advertisementId}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="space-y-1">
                            <p className="font-medium">{candidate.brandName}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {candidate.advertisementId}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={candidate.confidence * 100} className="w-24 h-1.5" />
                            <span className="font-medium text-sm w-12 text-right">
                              {(candidate.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Failed State */}
          {match.status === 'FAILED' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Processing Failed</AlertTitle>
              <AlertDescription>
                The image processing failed. This could be due to invalid image format,
                poor image quality, or a system error. Please try uploading a different image.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </main>
    </div>
  )
}
