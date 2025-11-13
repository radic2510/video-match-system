'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useMatchStore } from '@/stores/match-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

export default function ResultsPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = params.id as string

  const { isAuthenticated } = useAuthStore()
  const { getMatch, matches } = useMatchStore()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentMatch = matches[matchId]

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth')
    }
  }, [isAuthenticated, router])

  // Fetch match on mount
  useEffect(() => {
    const fetchMatch = async () => {
      try {
        setIsLoading(true)
        setError(null)
        await getMatch(matchId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch match')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMatch()
  }, [matchId, getMatch])

  // Polling for in-progress matches
  useEffect(() => {
    const match = matches[matchId]
    if (!match) return

    const shouldPoll =
      match.status === 'QUEUED' || match.status === 'PROCESSING'

    if (!shouldPoll) return

    const interval = setInterval(async () => {
      try {
        const updatedMatch = await getMatch(matchId)
        // If status changed to completed or failed, interval will be cleared on next render
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [matches, matchId, getMatch])

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
  }

  const handleBackToHome = () => {
    router.push('/')
  }

  if (isLoading && !currentMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-lg text-muted-foreground">Loading match result...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-lg text-red-500">Match not found</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={handleBackToHome}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-lg text-muted-foreground">Match not found</p>
              <Button onClick={handleBackToHome}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <Button variant="ghost" size="sm" onClick={handleBackToHome}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Match Result</CardTitle>
                <Badge
                  className={
                    currentMatch.status === 'COMPLETED'
                      ? 'bg-green-500'
                      : currentMatch.status === 'FAILED'
                      ? 'bg-red-500'
                      : currentMatch.status === 'PROCESSING'
                      ? 'bg-blue-500'
                      : 'bg-yellow-500'
                  }
                >
                  {currentMatch.status === 'COMPLETED' && <CheckCircle className="mr-1 h-3 w-3" />}
                  {currentMatch.status === 'FAILED' && <XCircle className="mr-1 h-3 w-3" />}
                  {currentMatch.status === 'PROCESSING' && <Clock className="mr-1 h-3 w-3" />}
                  {currentMatch.status === 'QUEUED' && <AlertCircle className="mr-1 h-3 w-3" />}
                  {currentMatch.status}
                </Badge>
              </div>
              <CardDescription>Match ID: {currentMatch.matchId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentMatch.status === 'QUEUED' && (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
                  <p className="text-lg font-medium">Your image is in the queue</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Processing will begin shortly...
                  </p>
                </div>
              )}

              {currentMatch.status === 'PROCESSING' && (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
                  <p className="text-lg font-medium">Processing your image</p>
                  {currentMatch.currentStage && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Stage: {currentMatch.currentStage}
                    </p>
                  )}
                  {currentMatch.progress !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      Progress: {currentMatch.progress}%
                    </p>
                  )}
                </div>
              )}

              {currentMatch.status === 'COMPLETED' && currentMatch.result && (
                <div className="space-y-4">
                  {currentMatch.result.matched && currentMatch.result.advertisement && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Match Found!</h3>
                      <div className="grid gap-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Brand:</span>
                          <span className="font-medium">{currentMatch.result.advertisement.brandName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Campaign:</span>
                          <span className="font-medium">{currentMatch.result.advertisement.campaignName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Confidence:</span>
                          <span className="font-medium">{(currentMatch.result.confidence * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!currentMatch.result.matched && (
                    <div className="text-center py-8">
                      <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium">No match found</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        We couldn't find a matching advertisement in our database
                      </p>
                    </div>
                  )}
                </div>
              )}

              {currentMatch.status === 'FAILED' && (
                <div className="text-center py-8">
                  <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                  <p className="text-lg font-medium text-red-500">Processing failed</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    An error occurred while processing your image
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
