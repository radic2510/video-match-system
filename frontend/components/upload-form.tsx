'use client'

import { useState, useRef, ChangeEvent, DragEvent, FormEvent } from 'react'
import { useMatchStore } from '@/stores/match-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Upload, Image as ImageIcon } from 'lucide-react'

interface UploadFormProps {
  onSuccess?: (matchId: string) => void
  onError?: (error: Error) => void
}

export function UploadForm({ onSuccess, onError }: UploadFormProps) {
  const { uploadImage, isUploading, error, clearError } = useMatchStore()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [priority, setPriority] = useState<string>('normal')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png']

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPG and PNG files are allowed'
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10 MB'
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

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
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
    setSelectedFile(null)
    setPreview(null)
    setValidationError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!selectedFile || validationError) {
      return
    }

    try {
      const response = await uploadImage(selectedFile, priority)

      // Clear form on success
      handleClearFile()
      setPriority('normal')

      if (onSuccess) {
        onSuccess(response.matchId)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed')
      if (onError) {
        onError(error)
      }
    }
  }

  const handleErrorDismiss = () => {
    clearError()
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Image</CardTitle>
        <CardDescription>
          Upload a photo of a display to match it with our advertisement database
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <div>
            <label htmlFor="file-upload" className="sr-only">
              Select image
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
                aria-label="Select image"
              />

              {!preview ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Drag and drop your image here
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
                    JPG or PNG, max 10MB
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-h-64 rounded-lg"
                    />
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
              High priority images are processed first
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!selectedFile || !!validationError || isUploading}
          >
            {isUploading ? (
              <>
                <span className="mr-2">Uploading...</span>
                <span className="animate-spin">⏳</span>
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
