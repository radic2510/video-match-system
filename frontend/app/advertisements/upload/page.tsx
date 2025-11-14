'use client'

import { useState, useRef, ChangeEvent, DragEvent, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { X, Upload, Video, CheckCircle, ArrowLeft } from 'lucide-react'

export default function AdvertisementUploadPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [brandName, setBrandName] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)

  const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
  const ALLOWED_TYPES = ['video/mp4']

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null
  }

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only MP4 video files are allowed'
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 100 MB'
    }

    return null
  }

  const handleFileSelect = (file: File) => {
    const error = validateFile(file)

    if (error) {
      setValidationError(error)
      setSelectedFile(null)
      setPreview(null)
      return
    }

    setValidationError(null)
    setSelectedFile(file)

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)

    // Load video into preview element
    if (videoPreviewRef.current) {
      videoPreviewRef.current.src = previewUrl
      videoPreviewRef.current.load()
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleClearFile = () => {
    if (preview) {
      URL.revokeObjectURL(preview)
    }
    setSelectedFile(null)
    setPreview(null)
    setValidationError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!selectedFile || validationError || !brandName.trim() || !campaignName.trim()) {
      if (!brandName.trim()) {
        setValidationError('Brand name is required')
      } else if (!campaignName.trim()) {
        setValidationError('Campaign name is required')
      }
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadError(null)

    try {
      // Simulate upload progress (since we can't track actual progress with fetch API)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const advertisement = await apiClient.uploadAdvertisement(
        selectedFile,
        brandName.trim(),
        campaignName.trim()
      )

      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadSuccess(true)

      // Wait a moment to show success state
      setTimeout(() => {
        router.push(`/advertisements/${advertisement.id}`)
      }, 1500)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed')
      setUploadError(error.message)
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <Link href="/advertisements">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Advertisements
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Upload Advertisement Video</CardTitle>
            <CardDescription>
              Upload a new advertisement video to add to the database
            </CardDescription>
          </CardHeader>

          <CardContent>
            {uploadSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Upload Successful!</h3>
                <p className="text-muted-foreground">Redirecting to advertisement details...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Video Upload Area */}
                <div>
                  <label htmlFor="file-upload" className="sr-only">
                    Select video
                  </label>

                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      id="file-upload"
                      type="file"
                      accept="video/mp4"
                      onChange={handleFileInputChange}
                      disabled={isUploading}
                      className="sr-only"
                      aria-label="Select video"
                    />

                    {!preview ? (
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <Video className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Drag and drop your video here
                          </p>
                          <p className="text-xs text-muted-foreground">or</p>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                          >
                            Click to browse
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          MP4 only, max 100MB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative inline-block">
                          <video
                            ref={videoPreviewRef}
                            controls
                            className="max-h-64 rounded-lg"
                            style={{ maxWidth: '100%' }}
                          >
                            <source src={preview} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2"
                            onClick={handleClearFile}
                            disabled={isUploading}
                            aria-label="Remove file"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm font-medium">{selectedFile?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Brand Name Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="brand-name"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Brand Name
                  </label>
                  <Input
                    id="brand-name"
                    type="text"
                    placeholder="e.g., Nike, Apple, Samsung"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    disabled={isUploading}
                    required
                  />
                </div>

                {/* Campaign Name Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="campaign-name"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Campaign Name
                  </label>
                  <Input
                    id="campaign-name"
                    type="text"
                    placeholder="e.g., Summer Sale 2024, New Product Launch"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    disabled={isUploading}
                    required
                  />
                </div>

                {/* Validation Error */}
                {validationError && (
                  <Alert variant="destructive">
                    <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
                )}

                {/* Upload Error */}
                {uploadError && (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription className="flex items-center justify-between">
                      <span>{uploadError}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadError(null)}
                        aria-label="Dismiss error"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Uploading...</span>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    !selectedFile ||
                    !!validationError ||
                    !brandName.trim() ||
                    !campaignName.trim() ||
                    isUploading
                  }
                >
                  {isUploading ? (
                    <>
                      <span className="mr-2">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Advertisement
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
