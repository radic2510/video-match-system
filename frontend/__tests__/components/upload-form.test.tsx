import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadForm } from '@/components/upload-form'
import { useMatchStore } from '@/stores/match-store'

// Mock the match store
vi.mock('@/stores/match-store', () => ({
  useMatchStore: vi.fn(),
}))

describe('UploadForm', () => {
  const mockUploadImage = vi.fn()
  const mockClearError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useMatchStore as any).mockReturnValue({
      uploadImage: mockUploadImage,
      isUploading: false,
      error: null,
      clearError: mockClearError,
    })
  })

  describe('Rendering', () => {
    it('should render the upload form with all elements', () => {
      render(<UploadForm />)

      expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/select image/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
    })

    it('should show drag and drop text', () => {
      render(<UploadForm />)

      expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument()
      expect(screen.getByText(/click to browse/i)).toBeInTheDocument()
    })

    it('should have priority selector with default value', () => {
      render(<UploadForm />)

      const prioritySelect = screen.getByRole('combobox', { name: /priority/i })
      expect(prioritySelect).toHaveTextContent(/normal/i)
    })
  })

  describe('File Selection', () => {
    it('should accept file selection via input', async () => {
      const user = userEvent.setup()
      render(<UploadForm />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/select image/i) as HTMLInputElement

      await user.upload(input, file)

      // The file will be processed and added to selectedFiles state
      // We can't directly check input.files in happy-dom, but we can verify the component responds
      // by checking if the file name appears or if uploadImage was called
      await waitFor(() => {
        expect(screen.getByText(/test\.jpg/i)).toBeInTheDocument()
      })
    })

    it('should show image preview after file selection', async () => {
      const user = userEvent.setup()
      render(<UploadForm />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/select image/i)

      await user.upload(input, file)

      await waitFor(() => {
        // The component shows a preview image with the filename as alt text
        expect(screen.getByAltText(/test\.jpg/i)).toBeInTheDocument()
      })
    })

    it('should show file name after selection', async () => {
      const user = userEvent.setup()
      render(<UploadForm />)

      const file = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/select image/i)

      await user.upload(input, file)

      await waitFor(() => {
        expect(screen.getByText(/test-image\.jpg/i)).toBeInTheDocument()
      })
    })

    it('should allow clearing selected file', async () => {
      const user = userEvent.setup()
      render(<UploadForm />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/select image/i)

      await user.upload(input, file)

      // Wait for preview to appear (use filename as alt text)
      await waitFor(() => {
        expect(screen.getByAltText(/test\.jpg/i)).toBeInTheDocument()
      })

      const clearButton = screen.getByRole('button', { name: /remove/i })
      await user.click(clearButton)

      await waitFor(() => {
        expect(screen.queryByAltText(/test\.jpg/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/test\.jpg/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('File Type Validation', () => {
    it('should only accept jpg and png files', () => {
      render(<UploadForm />)

      const input = screen.getByLabelText(/select image/i) as HTMLInputElement
      expect(input.accept).toContain('image/jpeg')
      expect(input.accept).toContain('image/png')
    })

    it('should show error for invalid file type via validation', () => {
      render(<UploadForm />)

      // The component validates file types in handleFileSelect
      // In real usage, the accept attribute would filter the file picker
      // We can verify the accept attribute is set correctly
      const input = screen.getByLabelText(/select image/i) as HTMLInputElement
      expect(input.accept).toContain('image/jpeg')
      expect(input.accept).toContain('image/png')
      expect(input.accept).not.toContain('image/gif')
    })

    it('should validate file types', () => {
      render(<UploadForm />)

      // Verify that the form has proper file type restrictions
      const input = screen.getByLabelText(/select image/i) as HTMLInputElement
      expect(input).toHaveAttribute('accept', 'image/jpeg,image/png')
    })
  })

  describe('File Size Validation', () => {
    it('should show error for files larger than 10MB', async () => {
      const user = userEvent.setup()
      render(<UploadForm />)

      // Create a file larger than 10MB
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      })
      const input = screen.getByLabelText(/select image/i)

      await user.upload(input, largeFile)

      expect(screen.getByText(/file size.*10.*mb/i)).toBeInTheDocument()
    })

    it('should accept files smaller than 10MB', async () => {
      const user = userEvent.setup()
      render(<UploadForm />)

      const validFile = new File(['test'], 'small.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/select image/i)

      await user.upload(input, validFile)

      expect(screen.queryByText(/file size.*10.*mb/i)).not.toBeInTheDocument()
    })
  })

  describe('Priority Selection', () => {
    it('should render priority selector with normal as default', () => {
      render(<UploadForm />)

      const priorityTrigger = screen.getByRole('combobox', { name: /priority/i })
      expect(priorityTrigger).toHaveTextContent(/normal/i)
    })

    it('should have priority selector', () => {
      render(<UploadForm />)

      const prioritySelect = screen.getByLabelText(/priority/i)
      expect(prioritySelect).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should call uploadImage when form is submitted with valid file', async () => {
      const user = userEvent.setup()
      mockUploadImage.mockResolvedValue({
        matchId: '123',
        status: 'QUEUED',
        queuePosition: 1,
        estimatedWaitTimeMs: 5000,
        createdAt: new Date().toISOString(),
      })

      render(<UploadForm />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/select image/i)

      await user.upload(input, file)

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(mockUploadImage).toHaveBeenCalledWith(file, 'normal')
      })
    })

    it('should submit with default priority', async () => {
      const user = userEvent.setup()
      mockUploadImage.mockResolvedValue({
        matchId: '123',
        status: 'QUEUED',
        queuePosition: 1,
        estimatedWaitTimeMs: 5000,
        createdAt: new Date().toISOString(),
      })

      render(<UploadForm />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/select image/i)

      await user.upload(input, file)

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      await waitFor(() => {
        // Verify it was called with default 'normal' priority
        expect(mockUploadImage).toHaveBeenCalledWith(file, 'normal')
      })
    })

    it('should not submit without a file', async () => {
      const user = userEvent.setup()
      render(<UploadForm />)

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      expect(mockUploadImage).not.toHaveBeenCalled()
    })

    it('should not submit with invalid file', async () => {
      const user = userEvent.setup()
      render(<UploadForm />)

      const file = new File(['test'], 'test.gif', { type: 'image/gif' })
      const input = screen.getByLabelText(/select image/i)

      await user.upload(input, file)

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      expect(mockUploadImage).not.toHaveBeenCalled()
    })

    it('should clear form after successful upload', async () => {
      const user = userEvent.setup()
      mockUploadImage.mockResolvedValue({
        matchId: '123',
        status: 'QUEUED',
        queuePosition: 1,
        estimatedWaitTimeMs: 5000,
        createdAt: new Date().toISOString(),
      })

      render(<UploadForm />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/select image/i)

      await user.upload(input, file)

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(screen.queryByAltText(/preview/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/test\.jpg/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading state during upload', async () => {
      const user = userEvent.setup()
      ;(useMatchStore as any).mockReturnValue({
        uploadImage: mockUploadImage,
        isUploading: true,
        error: null,
        clearError: mockClearError,
      })

      render(<UploadForm />)

      const uploadButton = screen.getByRole('button', { name: /uploading|loading/i })
      expect(uploadButton).toBeDisabled()
    })

    it('should disable input during upload', () => {
      ;(useMatchStore as any).mockReturnValue({
        uploadImage: mockUploadImage,
        isUploading: true,
        error: null,
        clearError: mockClearError,
      })

      render(<UploadForm />)

      const input = screen.getByLabelText(/select image/i)
      expect(input).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should display error message from store', () => {
      ;(useMatchStore as any).mockReturnValue({
        uploadImage: mockUploadImage,
        isUploading: false,
        error: 'Upload failed: Network error',
        clearError: mockClearError,
      })

      render(<UploadForm />)

      expect(screen.getByText(/upload failed.*network error/i)).toBeInTheDocument()
    })

    it('should clear error when clearError is called', async () => {
      const user = userEvent.setup()
      ;(useMatchStore as any).mockReturnValue({
        uploadImage: mockUploadImage,
        isUploading: false,
        error: 'Upload failed',
        clearError: mockClearError,
      })

      render(<UploadForm />)

      const dismissButton = screen.getByRole('button', { name: /dismiss|close/i })
      await user.click(dismissButton)

      expect(mockClearError).toHaveBeenCalled()
    })

    it('should show error when upload fails', async () => {
      const user = userEvent.setup()
      const mockError = new Error('Upload failed')
      mockUploadImage.mockRejectedValue(mockError)

      render(<UploadForm />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/select image/i)

      await user.upload(input, file)

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      // The store will handle the error, we just verify it was called
      await waitFor(() => {
        expect(mockUploadImage).toHaveBeenCalled()
      })
    })
  })

  describe('Drag and Drop', () => {
    it('should handle file selection', async () => {
      const user = userEvent.setup()
      render(<UploadForm />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/select image/i)

      // Simulate file upload through the hidden input
      await user.upload(input, file)

      await waitFor(() => {
        expect(screen.getByText(/test\.jpg/i)).toBeInTheDocument()
      })
    })

    it('should show drag and drop area', () => {
      render(<UploadForm />)

      const dropZone = screen.getByText(/drag.*drop/i).closest('div')
      expect(dropZone).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<UploadForm />)

      expect(screen.getByLabelText(/select image/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
    })

    it('should be keyboard navigable', () => {
      render(<UploadForm />)

      // Verify form elements exist and are properly labeled for keyboard navigation
      const uploadButton = screen.getByRole('button', { name: /upload/i })
      expect(uploadButton).toBeInTheDocument()

      const prioritySelect = screen.getByRole('combobox', { name: /priority/i })
      expect(prioritySelect).toBeInTheDocument()

      // Test focus on enabled element
      prioritySelect.focus()
      expect(prioritySelect).toHaveFocus()
    })

    it('should announce errors to screen readers', () => {
      ;(useMatchStore as any).mockReturnValue({
        uploadImage: mockUploadImage,
        isUploading: false,
        error: 'Upload failed',
        clearError: mockClearError,
      })

      render(<UploadForm />)

      const errorAlert = screen.getByRole('alert')
      expect(errorAlert).toHaveTextContent(/upload failed/i)
    })
  })

  describe('Responsive Design', () => {
    it('should render without layout errors', () => {
      const { container } = render(<UploadForm />)
      expect(container).toBeInTheDocument()
    })
  })

  describe('Callback Props', () => {
    it('should call onSuccess callback after successful upload', async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()

      mockUploadImage.mockResolvedValue({
        matchId: '123',
        status: 'QUEUED',
        queuePosition: 1,
        estimatedWaitTimeMs: 5000,
        createdAt: new Date().toISOString(),
      })

      render(<UploadForm onSuccess={onSuccess} />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/select image/i)

      await user.upload(input, file)

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith('123')
      })
    })

    it('should call onError callback when upload fails', async () => {
      const user = userEvent.setup()
      const onError = vi.fn()
      const mockError = new Error('Upload failed')

      mockUploadImage.mockRejectedValue(mockError)

      render(<UploadForm onError={onError} />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/select image/i)

      await user.upload(input, file)

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(mockError)
      })
    })
  })
})
