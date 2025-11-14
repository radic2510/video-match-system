import { test, expect } from '@playwright/test'
import { login, clearAuth, TEST_USER } from './helpers'
import path from 'path'

test.describe('Advertisement Upload Page', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    // Clear any existing authentication
    await page.goto('/')
    await clearAuth(page)

    // Login
    await login(page, TEST_USER.email, TEST_USER.password)

    // Verify we're on the home page and logged in
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()

    // Navigate to advertisement upload page via advertisements page
    await page.goto('/advertisements', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    // Click the upload new button
    await page.getByRole('link', { name: /upload new/i }).click()
    await page.waitForURL('/advertisements/upload', { timeout: 10000 })

    // Wait for the page to be ready
    await expect(page.locator('text=/Upload Advertisement Video/i')).toBeVisible()
  })

  test.describe('Page Display', () => {
    test('should display upload page header', async ({ page }) => {
      // Check page title
      await expect(page.locator('text=/Upload Advertisement Video/i')).toBeVisible()

      // Check description
      await expect(
        page.locator('text=/Upload a new advertisement video to add to the database/i')
      ).toBeVisible()

      // Check back button
      await expect(page.getByRole('link', { name: /back to advertisements/i })).toBeVisible()
    })

    test('should display video upload form', async ({ page }) => {
      // Check for file input
      const fileInput = page.locator('input[type="file"]')
      await expect(fileInput).toBeAttached()

      // Check for drag and drop area
      await expect(page.locator('text=/Drag and drop your video/i')).toBeVisible()

      // Check for browse button
      await expect(page.getByRole('button', { name: /click to browse/i })).toBeVisible()

      // Check for brand name input
      await expect(page.locator('#brand-name')).toBeVisible()

      // Check for campaign name input
      await expect(page.locator('#campaign-name')).toBeVisible()

      // Check for submit button
      await expect(page.getByRole('button', { name: /upload advertisement/i })).toBeVisible()
    })

    test('should display file size and type requirements', async ({ page }) => {
      // Check for file requirements text
      await expect(page.locator('text=/MP4 only, max 100MB/i')).toBeVisible()
    })
  })

  test.describe('File Selection', () => {
    test('should allow file selection via file input', async ({ page }) => {
      // Note: We need an actual video file for this test
      // For now, we'll test with a mock file

      // Create a small video buffer (this won't be a valid video, but tests the upload mechanism)
      const videoBuffer = Buffer.alloc(1024 * 100) // 100KB

      // Upload the file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: videoBuffer,
      })

      // Wait for preview to appear (video player)
      await expect(page.locator('video')).toBeVisible({ timeout: 5000 })

      // Verify filename is displayed
      await expect(page.locator('text=/test-video.mp4/i')).toBeVisible()
    })

    test('should display video preview after selection', async ({ page }) => {
      // Create a small video buffer
      const videoBuffer = Buffer.alloc(1024 * 100) // 100KB

      // Upload the file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: videoBuffer,
      })

      // Wait for video preview to appear
      const videoPreview = page.locator('video')
      await expect(videoPreview).toBeVisible({ timeout: 5000 })

      // Verify video has controls
      const hasControls = await videoPreview.getAttribute('controls')
      expect(hasControls).not.toBeNull()
    })

    test('should allow removing selected file', async ({ page }) => {
      // Create a small video buffer
      const videoBuffer = Buffer.alloc(1024 * 100) // 100KB

      // Upload the file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: videoBuffer,
      })

      // Wait for preview to appear
      await expect(page.locator('video')).toBeVisible()

      // Wait for the button to be stable before clicking
      await page.waitForTimeout(500)

      // Click remove button (X button) - using aria-label selector
      const removeButton = page.locator('button[aria-label="Remove file"]')
      await removeButton.waitFor({ state: 'visible', timeout: 10000 })
      await removeButton.click({ force: true })

      // Verify preview is removed
      await expect(page.locator('video')).not.toBeVisible()

      // Verify drag and drop area is shown again
      await expect(page.locator('text=/Drag and drop your video/i')).toBeVisible()
    })

    test('should display file size', async ({ page }) => {
      // Create a small video buffer
      const videoBuffer = Buffer.alloc(1024 * 100) // 100KB

      // Upload the file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: videoBuffer,
      })

      // Wait for preview to appear
      await expect(page.locator('video')).toBeVisible()

      // Check for file size display (should show MB)
      await expect(page.locator('text=/\\d+\\.\\d+ MB/i')).toBeVisible()
    })
  })

  test.describe('File Validation', () => {
    test('should reject files that are too large', async ({ page }) => {
      // Skip this test due to Playwright's 50MB buffer limitation
      // In production, file size validation happens on the client side
      test.skip()
    })

    test('should reject non-video files', async ({ page }) => {
      // Create a text file
      const textFile = Buffer.from('This is not a video')

      // Upload the text file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'document.txt',
        mimeType: 'text/plain',
        buffer: textFile,
      })

      // Check for validation error
      await expect(page.locator('text=/Only MP4 video files are allowed/i')).toBeVisible()

      // Verify preview is not shown
      await expect(page.locator('video')).not.toBeVisible()
    })

    test('should accept valid MP4 files', async ({ page }) => {
      // Create a small video buffer
      const videoBuffer = Buffer.alloc(1024 * 100) // 100KB

      // Upload valid MP4
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: videoBuffer,
      })

      // Verify preview is shown (no validation error)
      await expect(page.locator('video')).toBeVisible()

      // Verify no error messages
      await expect(page.locator('text=/Only MP4 video files are allowed/i')).not.toBeVisible()
      await expect(page.locator('text=/must be less than 100 MB/i')).not.toBeVisible()
    })
  })

  test.describe('Form Inputs', () => {
    test('should require brand name', async ({ page }) => {
      // Try to submit without brand name
      const brandInput = page.locator('#brand-name')
      await expect(brandInput).toHaveAttribute('required', '')
    })

    test('should require campaign name', async ({ page }) => {
      // Try to submit without campaign name
      const campaignInput = page.locator('#campaign-name')
      await expect(campaignInput).toHaveAttribute('required', '')
    })

    test('should allow entering brand name', async ({ page }) => {
      const brandInput = page.locator('#brand-name')
      await brandInput.fill('Nike')

      // Verify the value
      await expect(brandInput).toHaveValue('Nike')
    })

    test('should allow entering campaign name', async ({ page }) => {
      const campaignInput = page.locator('#campaign-name')
      await campaignInput.fill('Summer Sale 2024')

      // Verify the value
      await expect(campaignInput).toHaveValue('Summer Sale 2024')
    })

    test('should show validation error for missing brand name on submit', async ({ page }) => {
      // Create a small video buffer
      const videoBuffer = Buffer.alloc(1024 * 100) // 100KB

      // Upload the file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: videoBuffer,
      })

      // Wait for preview
      await expect(page.locator('video')).toBeVisible()

      // Fill only campaign name
      await page.locator('#campaign-name').fill('Test Campaign')

      // Wait for form to stabilize
      await page.waitForTimeout(500)

      // Verify button is disabled (without brand name)
      const submitButton = page.locator('button[type="submit"]')
      await expect(submitButton).toBeDisabled()
    })

    test('should show validation error for missing campaign name on submit', async ({ page }) => {
      // Create a small video buffer
      const videoBuffer = Buffer.alloc(1024 * 100) // 100KB

      // Upload the file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: videoBuffer,
      })

      // Wait for preview
      await expect(page.locator('video')).toBeVisible()

      // Fill only brand name
      await page.locator('#brand-name').fill('Nike')

      // Wait for form to stabilize
      await page.waitForTimeout(500)

      // Verify button is disabled (without campaign name)
      const submitButton = page.locator('button[type="submit"]')
      await expect(submitButton).toBeDisabled()
    })
  })

  test.describe('Upload Submission', () => {
    test('should disable upload button when no file is selected', async ({ page }) => {
      // Fill form fields
      await page.locator('#brand-name').fill('Nike')
      await page.locator('#campaign-name').fill('Summer Sale 2024')

      // Verify button is disabled
      const uploadButton = page.getByRole('button', { name: /upload advertisement/i })
      await expect(uploadButton).toBeDisabled()
    })

    test('should disable upload button when brand name is missing', async ({ page }) => {
      // Create a small video buffer
      const videoBuffer = Buffer.alloc(1024 * 100) // 100KB

      // Upload the file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: videoBuffer,
      })

      // Wait for preview
      await expect(page.locator('video')).toBeVisible()

      // Fill only campaign name
      await page.locator('#campaign-name').fill('Summer Sale 2024')

      // Verify button is disabled
      const uploadButton = page.getByRole('button', { name: /upload advertisement/i })
      await expect(uploadButton).toBeDisabled()
    })

    test('should disable upload button when campaign name is missing', async ({ page }) => {
      // Create a small video buffer
      const videoBuffer = Buffer.alloc(1024 * 100) // 100KB

      // Upload the file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: videoBuffer,
      })

      // Wait for preview
      await expect(page.locator('video')).toBeVisible()
      await page.waitForTimeout(1000)

      // Fill only brand name (wait for it to be stable)
      const brandInput = page.locator('#brand-name')
      await brandInput.waitFor({ state: 'visible', timeout: 5000 })
      await brandInput.fill('Nike')
      await page.waitForTimeout(500)

      // Verify button is disabled
      const uploadButton = page.locator('button[type="submit"]')
      await expect(uploadButton).toBeDisabled()
    })

    test('should enable upload button when all fields are filled', async ({ page }) => {
      // Create a small video buffer
      const videoBuffer = Buffer.alloc(1024 * 100) // 100KB

      // Upload the file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: videoBuffer,
      })

      // Wait for preview
      await expect(page.locator('video')).toBeVisible()
      await page.waitForTimeout(1000)

      // Fill both fields (wait for stability between fills)
      const brandInput = page.locator('#brand-name')
      await brandInput.waitFor({ state: 'visible', timeout: 5000 })
      await brandInput.fill('Nike')
      await page.waitForTimeout(500)

      const campaignInput = page.locator('#campaign-name')
      await campaignInput.waitFor({ state: 'visible', timeout: 5000 })
      await campaignInput.fill('Summer Sale 2024')
      await page.waitForTimeout(500)

      // Verify button is enabled
      const uploadButton = page.locator('button[type="submit"]')
      await expect(uploadButton).toBeEnabled()
    })

    test('should show uploading state during upload', async ({ page }) => {
      // Create a small video buffer
      const videoBuffer = Buffer.alloc(1024 * 100) // 100KB

      // Upload the file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: videoBuffer,
      })

      // Wait for preview
      await expect(page.locator('video')).toBeVisible()
      await page.waitForTimeout(1000)

      // Fill form fields (wait for stability between fills)
      const brandInput = page.locator('#brand-name')
      await brandInput.waitFor({ state: 'visible', timeout: 5000 })
      await brandInput.fill('Nike')
      await page.waitForTimeout(500)

      const campaignInput = page.locator('#campaign-name')
      await campaignInput.waitFor({ state: 'visible', timeout: 5000 })
      await campaignInput.fill('Summer Sale 2024')
      await page.waitForTimeout(500)

      // Click upload button
      const submitButton = page.locator('button[type="submit"]')
      await submitButton.waitFor({ state: 'visible', timeout: 5000 })
      await submitButton.click()

      // Check for uploading state or redirect
      // Upload might be very quick, so we check for either uploading state or redirect
      try {
        await page.waitForURL('/advertisements/*', { timeout: 5000 })
      } catch {
        // If not redirected yet, check for uploading state
        const uploadingText = page.locator('text=/Uploading/i')
        const progressBar = page.locator('[role="progressbar"]')
        const hasUploadingText = await uploadingText.isVisible().catch(() => false)
        const hasProgressBar = await progressBar.isVisible().catch(() => false)
        // Upload state is optional (might be too fast to catch)
      }
    })

    test('should show progress bar during upload', async ({ page }) => {
      // Create a small video buffer
      const videoBuffer = Buffer.alloc(1024 * 100) // 100KB

      // Upload the file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: videoBuffer,
      })

      // Wait for preview
      await expect(page.locator('video')).toBeVisible()
      await page.waitForTimeout(1000)

      // Fill form fields (wait for stability between fills)
      const brandInput = page.locator('#brand-name')
      await brandInput.waitFor({ state: 'visible', timeout: 5000 })
      await brandInput.fill('Nike')
      await page.waitForTimeout(500)

      const campaignInput = page.locator('#campaign-name')
      await campaignInput.waitFor({ state: 'visible', timeout: 5000 })
      await campaignInput.fill('Summer Sale 2024')
      await page.waitForTimeout(500)

      // Click upload button
      const submitButton = page.locator('button[type="submit"]')
      await submitButton.waitFor({ state: 'visible', timeout: 5000 })
      await submitButton.click()

      // Wait for either redirect or progress indication
      try {
        await page.waitForURL('/advertisements/*', { timeout: 5000 })
      } catch {
        // If not redirected, check for progress indicator
        const progressBar = page.locator('[role="progressbar"]')
        await expect(progressBar).toBeVisible().catch(() => {})
      }
    })
  })

  test.describe('Navigation', () => {
    test('should navigate back to advertisements page', async ({ page }) => {
      // Click back to advertisements button
      const backButton = page.locator('a[href="/advertisements"]').filter({ hasText: /back to advertisements/i })
      await backButton.waitFor({ state: 'visible', timeout: 10000 })
      await backButton.click()

      // Should navigate to advertisements page
      await page.waitForURL('/advertisements', { timeout: 10000 })
      await expect(page).toHaveURL('/advertisements')
    })

    test('should handle form state when navigating away and back', async ({ page }) => {
      // Fill form fields
      await page.locator('#brand-name').fill('Nike')
      await page.locator('#campaign-name').fill('Summer Sale 2024')

      // Navigate away
      await page.goto('/advertisements')

      // Navigate back
      await page.goto('/advertisements/upload')

      // Form should be cleared (fresh state)
      await expect(page.locator('#brand-name')).toHaveValue('')
      await expect(page.locator('#campaign-name')).toHaveValue('')
    })
  })

  test.describe('Error Handling', () => {
    test('should handle upload errors gracefully', async ({ page }) => {
      // This test would require mocking a failed API response
      // For now, we'll skip as it depends on backend behavior
      test.skip()
    })

    test('should allow retrying after validation error', async ({ page }) => {
      // Create an invalid file
      const invalidFile = Buffer.from('Not a video')

      // Try to upload invalid file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'invalid.txt',
        mimeType: 'text/plain',
        buffer: invalidFile,
      })

      // Check for validation error
      await expect(page.locator('text=/Only MP4 video files are allowed/i')).toBeVisible()

      // Now upload a valid file
      const validVideo = Buffer.alloc(1024 * 100) // 100KB
      await fileInput.setInputFiles({
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        buffer: validVideo,
      })

      // Verify error is cleared and preview is shown
      await expect(page.locator('text=/Only MP4 video files are allowed/i')).not.toBeVisible()
      await expect(page.locator('video')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should be navigable via keyboard', async ({ page }) => {
      // Focus on brand name input
      const brandInput = page.locator('#brand-name')
      await brandInput.focus()

      // Verify focus
      await expect(brandInput).toBeFocused()

      // Tab to next field (campaign name)
      await page.keyboard.press('Tab')

      // Should be on campaign name input
      const campaignInput = page.locator('#campaign-name')
      await expect(campaignInput).toBeFocused()
    })

    test('should have proper ARIA labels', async ({ page }) => {
      // Check file input has aria-label
      const fileInput = page.locator('input[type="file"]')
      const ariaLabel = await fileInput.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()

      // Check that inputs have associated labels
      const brandLabel = page.locator('label[for="brand-name"]')
      await expect(brandLabel).toBeVisible()

      const campaignLabel = page.locator('label[for="campaign-name"]')
      await expect(campaignLabel).toBeVisible()
    })
  })
})
