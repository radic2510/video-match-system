'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { useMatchStore, type BulkUploadResult } from '@/stores/match-store'
import { UploadForm } from '@/components/upload-form'
import { UploadResults } from '@/components/upload-results'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogOut, History } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { matches } = useMatchStore()
  const [bulkUploadResults, setBulkUploadResults] = useState<BulkUploadResult[] | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth')
    }
  }, [isAuthenticated, router])

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return null
  }

  const handleUploadSuccess = (matchId: string) => {
    // Redirect to results page for single upload
    router.push(`/results/${matchId}`)
  }

  const handleBulkUploadSuccess = (results: BulkUploadResult[]) => {
    // Show results summary for bulk upload
    setBulkUploadResults(results)
  }

  const handleUploadMore = () => {
    // Reset to show upload form again
    setBulkUploadResults(null)
  }

  const handleLogout = () => {
    logout()
    router.push('/auth')
  }

  // Get recent matches (last 3)
  const recentMatches = Object.values(matches)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Video Match System</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {user.name}!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/history">
              <Button variant="outline" size="sm">
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="grid gap-8">
          {/* Upload Section or Results */}
          <section>
            {bulkUploadResults ? (
              <UploadResults results={bulkUploadResults} onUploadMore={handleUploadMore} />
            ) : (
              <UploadForm onSuccess={handleUploadSuccess} onBulkSuccess={handleBulkUploadSuccess} />
            )}
          </section>

          {/* Recent Matches Section - only show when not displaying bulk results */}
          {!bulkUploadResults && (
          <section>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Matches</CardTitle>
                    <CardDescription>Your last 3 image matches</CardDescription>
                  </div>
                  <Link href="/history">
                    <Button variant="ghost" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentMatches.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No recent matches. Upload an image to get started!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentMatches.map((match) => (
                      <Link key={match.matchId} href={`/results/${match.matchId}`}>
                        <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                          <div className="space-y-1">
                            <p className="font-mono text-sm font-medium">
                              {match.matchId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Status: {match.status}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
          )}
        </div>
      </main>
    </div>
  )
}
