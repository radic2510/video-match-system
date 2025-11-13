'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * Skeleton loader for match history list
 */
export function MatchListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 rounded-lg border"
        >
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton loader for match result details
 */
export function MatchResultSkeleton() {
  return (
    <div className="space-y-6">
      {/* Status Section */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result Section */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Skeleton loader for card list (e.g., advertisements)
 */
export function CardListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-40 w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Skeleton loader for table rows
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton loader for page content
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Content */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
