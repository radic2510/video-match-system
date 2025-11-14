'use client'

import { useState, useRef, ChangeEvent, DragEvent, FormEvent } from 'react'
import { useMatchStore, type BulkUploadResult } from '@/stores/match-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { X, Upload, Image as ImageIcon, Trash2 } from 'lucide-react'

interface UploadFormProps {
  onSuccess?: (matchId: string) => void
  onBulkSuccess?: (results: BulkUploadResult[]) => void
  onError?: (error: Error) => void
  maxFiles?: number
}

interface FileWithPreview {
  file: File
  preview: string
  id: string
}

export function UploadForm({ onSuccess, onBulkSuccess, onError, maxFiles = 20 }: UploadFormProps) {
  const { uploadImage, uploadBulkImages, isUploading, error, clearError } = useMatchStore()

  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([])
  const [priority, setPriority] = useState<string>('normal')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png']

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPG and PNG files are allowed'
    }

    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File size must be less than 10 MB`
    }

    return null
  }

  const generateFileId = () => Math.random().toString(36).substring(2, 15)

  const handleFilesSelect = (newFiles: File[]) => {
    // Check max files limit
    if (selectedFiles.length + newFiles.length > maxFiles) {
      setValidationError(`Maximum ${maxFiles} images allowed per batch`)
      return
    }

    const validFiles: FileWithPreview[] = []
    const errors: string[] = []

    newFiles.forEach((file) => {
      const error = validateFile(file)
      if (error) {
        errors.push(error)
      } else {
        // Check for duplicates by name and size
        const isDuplicate = selectedFiles.some(
          (f) => f.file.name === file.name && f.file.size === file.size
        )
        if (!isDuplicate) {
          // Create preview
          const reader = new FileReader()
          const fileId = generateFileId()
          reader.onloadend = () => {
            setSelectedFiles((prev) => [
              ...prev,
              { file, preview: reader.result as string, id: fileId },
            ])
          }
          reader.readAsDataURL(file)
        }
      }
    })

    if (errors.length > 0) {
      setValidationError(errors.join('; '))
    } else {
      setValidationError(null)
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFilesSelect(files)
    }
    // Reset input value to allow selecting the same files again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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

    const files = Array.from(e.dataTransfer.files || [])
    if (files.length > 0) {
      handleFilesSelect(files)
    }
  }

  const handleRemoveFile = (fileId: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId))
    setValidationError(null)
  }

  const handleClearAll = () => {
    setSelectedFiles([])
    setValidationError(null)
    setUploadProgress(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getTotalSize = () => {
    return selectedFiles.reduce((sum, f) => sum + f.file.size, 0)
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (selectedFiles.length === 0 || validationError) {
      return
    }

    try {
      const files = selectedFiles.map((f) => f.file)

      // Handle single file upload (backward compatibility)
      if (files.length === 1) {
        const response = await uploadImage(files[0], priority)
        handleClearAll()
        setPriority('normal')
        if (onSuccess) {
          onSuccess(response.matchId)
        }
      } else {
        // Handle bulk upload
        const results = await uploadBulkImages(files, priority, (completed, total) => {
          setUploadProgress({ completed, total })
        })
        handleClearAll()
        setPriority('normal')
        setUploadProgress(null)
        if (onBulkSuccess) {
          onBulkSuccess(results)
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed')
      setUploadProgress(null)
      if (onError) {
        onError(error)
      }
    }
  }

  const handleErrorDismiss = () => {
    clearError()
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Images</CardTitle>
        <CardDescription>
          Upload one or more photos of displays to match them with our advertisement database (max {maxFiles} images)
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <div>
            <label htmlFor="file-upload" className="sr-only">
              Select images
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
                accept="image/jpeg,image/png"
                onChange={handleFileInputChange}
                disabled={isUploading}
                className="sr-only"
                aria-label="Select images"
                multiple
              />

              {selectedFiles.length === 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Drag and drop your images here
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
                    JPG or PNG, max 10MB per file, up to {maxFiles} files
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Summary */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="text-left">
                      <p className="text-sm font-medium">
                        {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total size: {formatBytes(getTotalSize())}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearAll}
                      disabled={isUploading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </div>

                  {/* File Thumbnails Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-2">
                    {selectedFiles.map((fileWithPreview) => (
                      <div key={fileWithPreview.id} className="relative group">
                        <div className="aspect-square relative overflow-hidden rounded-lg border bg-muted">
                          <img
                            src={fileWithPreview.preview}
                            alt={fileWithPreview.file.name}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveFile(fileWithPreview.id)}
                          disabled={isUploading}
                          aria-label={`Remove ${fileWithPreview.file.name}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <p className="mt-1 text-xs text-muted-foreground truncate" title={fileWithPreview.file.name}>
                          {fileWithPreview.file.name}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Add More Button */}
                  {selectedFiles.length < maxFiles && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      Add more images ({selectedFiles.length}/{maxFiles})
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <Alert variant="destructive">
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Store Error */}
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleErrorDismiss}
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Progress */}
          {isUploading && uploadProgress && uploadProgress.total > 1 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading images...</span>
                <span className="font-medium">
                  {uploadProgress.completed} / {uploadProgress.total}
                </span>
              </div>
              <Progress value={(uploadProgress.completed / uploadProgress.total) * 100} />
            </div>
          )}

          {/* Priority Selection */}
          <div className="space-y-2">
            <label
              htmlFor="priority-select"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Priority
            </label>
            <Select
              value={priority}
              onValueChange={setPriority}
              disabled={isUploading}
            >
              <SelectTrigger id="priority-select" aria-label="Priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selectedFiles.length > 1
                ? 'Priority applies to all images in this batch'
                : 'High priority images are processed first'}
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={selectedFiles.length === 0 || !!validationError || isUploading}
          >
            {isUploading ? (
              <>
                <span className="mr-2">
                  Uploading{uploadProgress && uploadProgress.total > 1 ? ` (${uploadProgress.completed}/${uploadProgress.total})` : ''}...
                </span>
                <span className="animate-spin">⏳</span>
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {selectedFiles.length > 1 ? `${selectedFiles.length} Images` : 'Image'}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
