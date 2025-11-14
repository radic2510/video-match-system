'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { Advertisement } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Video, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'

export default function AdvertisementsPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  const [advertisements, setAdvertisements] = useState<Advertisement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const pageSize = 20

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth')
    }
  }, [isAuthenticated, router])

  // Load advertisements
  useEffect(() => {
    if (!isAuthenticated) return

    const loadAdvertisements = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await apiClient.listAdvertisements(currentPage, pageSize)
        setAdvertisements(response.content)
        setTotalPages(response.pageable.totalPages)
        setTotalElements(response.pageable.totalElements)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load advertisements')
        setError(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadAdvertisements()
  }, [currentPage, isAuthenticated])

  if (!isAuthenticated) {
    return null
  }

  // Filter advertisements by search query
  const filteredAdvertisements = advertisements.filter(
    (ad) =>
      ad.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ad.campaignName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusVariant = (status: Advertisement['status']) => {
    switch (status) {
      case 'READY':
        return 'default'
      case 'PROCESSING':
        return 'secondary'
      case 'FAILED':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Advertisements</h1>
              <p className="text-sm text-muted-foreground">
                Manage your advertisement database
              </p>
            </div>
          </div>
          <Link href="/advertisements/upload">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Upload New
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="space-y-6">
          {/* Search Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by brand or campaign name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Advertisements List */}
          <Card>
            <CardHeader>
              <CardTitle>All Advertisements</CardTitle>
              <CardDescription>
                {isLoading ? (
                  'Loading...'
                ) : (
                  `Showing ${filteredAdvertisements.length} of ${totalElements} advertisements`
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                      <Skeleton className="h-16 w-24 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : filteredAdvertisements.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No advertisements found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                      ? 'Try adjusting your search query'
                      : 'Get started by uploading your first advertisement'}
                  </p>
                  {!searchQuery && (
                    <Link href="/advertisements/upload">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Upload Advertisement
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAdvertisements.map((ad) => (
                    <Link key={ad.id} href={`/advertisements/${ad.id}`}>
                      <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                        <div className="flex-shrink-0">
                          <div className="h-16 w-24 bg-muted rounded flex items-center justify-center">
                            <Video className="h-8 w-8 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{ad.brandName}</h3>
                            <Badge variant={getStatusVariant(ad.status)} className="shrink-0">
                              {ad.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mb-1">
                            {ad.campaignName}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Uploaded: {formatDate(ad.createdAt)}</span>
                            {ad.frameCount !== null && (
                              <span>{ad.frameCount} frames</span>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="shrink-0">
                          View Details
                        </Button>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
