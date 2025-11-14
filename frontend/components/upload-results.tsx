'use client'

import Link from 'next/link'
import type { BulkUploadResult } from '@/stores/match-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, FileImage, Upload, History } from 'lucide-react'

interface UploadResultsProps {
  results: BulkUploadResult[]
  onUploadMore?: () => void
}

export function UploadResults({ results, onUploadMore }: UploadResultsProps) {
  const successCount = results.filter((r) => r.success).length
  const failedCount = results.filter((r) => !r.success).length
  const totalCount = results.length

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Results</CardTitle>
        <CardDescription>
          {successCount} of {totalCount} image{totalCount !== 1 ? 's' : ''} uploaded successfully
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {successCount}
                </p>
                <p className="text-sm text-muted-foreground">Successful</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/20">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {failedCount}
                </p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Failed Uploads Alert */}
        {failedCount > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              {failedCount} image{failedCount !== 1 ? 's' : ''} failed to upload. Please check the
              details below and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Results Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Image</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Filename</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Size</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                    {/* Thumbnail */}
                    <td className="px-4 py-3">
                      <div className="h-12 w-12 rounded overflow-hidden bg-muted flex items-center justify-center">
                        <FileImage className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </td>

                    {/* Filename */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium truncate max-w-xs" title={result.file.name}>
                        {result.file.name}
                      </p>
                    </td>

                    {/* Size */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-muted-foreground">
                        {formatBytes(result.file.size)}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {result.success ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            Uploaded
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">
                              Failed
                            </span>
                          </div>
                          {result.error && (
                            <p className="text-xs text-muted-foreground max-w-xs truncate" title={result.error}>
                              {result.error}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      {result.success && result.matchId ? (
                        <Link href={`/results/${result.matchId}`}>
                          <Button variant="outline" size="sm">
                            View Result
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="ghost" size="sm" disabled>
                          N/A
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {onUploadMore && (
            <Button onClick={onUploadMore} className="flex-1">
              <Upload className="mr-2 h-4 w-4" />
              Upload More Images
            </Button>
          )}
          <Link href="/history" className="flex-1">
            <Button variant="outline" className="w-full">
              <History className="mr-2 h-4 w-4" />
              View All Results
            </Button>
          </Link>
        </div>

        {/* Additional Info */}
        {successCount > 0 && (
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Your images are being processed. You can view the matching progress and results in
              the{' '}
              <Link href="/history" className="font-medium underline">
                History
              </Link>{' '}
              page or by clicking "View Result" for each image.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
