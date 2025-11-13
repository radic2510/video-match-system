'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useMatchStore } from '@/stores/match-store'
import { MatchHistory } from '@/components/match-history'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function HistoryPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const { matches } = useMatchStore()

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth')
    }
  }, [isAuthenticated, router])

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
  }

  const handleMatchClick = (matchId: string) => {
    router.push(`/results/${matchId}`)
  }

  const handleBackToHome = () => {
    router.push('/')
  }

  // Convert matches object to array
  const matchesArray = Object.values(matches).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

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
          <MatchHistory
            matches={matchesArray}
            isLoading={false}
            onMatchClick={handleMatchClick}
          />
        </div>
      </main>
    </div>
  )
}
