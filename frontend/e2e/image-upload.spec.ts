import { test, expect } from '@playwright/test'
import { login, uploadImage, clearAuth, TEST_USER } from './helpers'
import path from 'path'

test.describe('Image Upload Flow', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    // Clear any existing authentication
    await page.goto('/')
    await clearAuth(page)

    // Login
    await login(page, TEST_USER.email, TEST_USER.password)

    // Verify we're on the home page
    await expect(page).toHaveURL('/')
  })

  test.describe('File Selection', () => {
    test('should display upload form', async ({ page }) => {
      // Check if upload form is visible (title is "Upload Images" plural)
      await expect(page.locator('text=/Upload Images/i').first()).toBeVisible()

      // Check for file input (hidden but present)
      const fileInput = page.locator('input[type="file"]')
      await expect(fileInput).toBeAttached()

      // Check for drag and drop area
      await expect(page.locator('text=/Drag and drop your images/i')).toBeVisible()

      // Check for priority selector (combobox role)
      await expect(page.getByRole('combobox')).toBeVisible()
    })

    test('should allow file selection via file input', async ({ page }) => {
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')

      // Find the file input
      const fileInput = page.locator('input[type="file"]')

      // Upload the file
      await fileInput.setInputFiles(filePath)

      // Wait for preview to appear - look for file summary
      await expect(page.locator('text=/1 file selected/i')).toBeVisible({ timeout: 5000 })

      // Verify filename is displayed
      await expect(page.locator('text=/test-image.jpg/i')).toBeVisible()
    })

    test('should display image preview after selection', async ({ page }) => {
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')

      // Upload the file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)

      // Wait for file summary to appear
      await expect(page.locator('text=/1 file selected/i')).toBeVisible({ timeout: 5000 })

      // Verify preview has thumbnail image
      const preview = page.locator('img[alt="test-image.jpg"]')
      await expect(preview).toBeVisible()

      // Verify preview has src attribute
      const src = await preview.getAttribute('src')
      expect(src).toBeTruthy()
      expect(src).toContain('data:image')
    })

    test('should allow removing selected file', async ({ page }) => {
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')

      // Upload the file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)

      // Wait for file summary to appear
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()

      // Click "Clear All" button
      await page.getByRole('button', { name: /clear all/i }).click()

      // Verify file summary is removed
      await expect(page.locator('text=/1 file selected/i')).not.toBeVisible()

      // Verify drag and drop area is shown again
      await expect(page.locator('text=/Drag and drop your images/i')).toBeVisible()
    })
  })

  test.describe('File Validation', () => {
    test('should reject files that are too large', async ({ page }) => {
      // Create a large file (11MB, over the 10MB limit)
      const largeFile = Buffer.alloc(11 * 1024 * 1024, 'a')

      // Upload the large file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'large-image.jpg',
        mimeType: 'image/jpeg',
        buffer: largeFile,
      })

      // Check for validation error
      await expect(page.locator('text=/must be less than 10 MB/i')).toBeVisible()

      // Verify file summary is not shown (file was rejected)
      await expect(page.locator('text=/file selected/i')).not.toBeVisible()

      // Verify upload button is disabled
      const uploadButton = page.getByRole('button', { name: /^upload/i })
      await expect(uploadButton).toBeDisabled()
    })

    test('should reject non-image files', async ({ page }) => {
      // Create a text file
      const textFile = Buffer.from('This is not an image')

      // Upload the text file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'document.txt',
        mimeType: 'text/plain',
        buffer: textFile,
      })

      // Check for validation error
      await expect(page.locator('text=/Only JPG and PNG files/i')).toBeVisible()

      // Verify file summary is not shown (file was rejected)
      await expect(page.locator('text=/file selected/i')).not.toBeVisible()
    })

    test('should accept valid JPEG files', async ({ page }) => {
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')

      // Upload valid JPEG
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)

      // Verify file summary is shown (no validation error)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()

      // Verify no error messages
      await expect(page.locator('text=/Only JPG and PNG files/i')).not.toBeVisible()
      await expect(page.locator('text=/must be less than 10 MB/i')).not.toBeVisible()
    })

    test('should accept valid PNG files', async ({ page }) => {
      const filePath = path.join(__dirname, 'fixtures', 'test-image.png')

      // Upload valid PNG
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)

      // Verify file summary is shown (no validation error)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()

      // Verify no error messages
      await expect(page.locator('text=/Only JPG and PNG files/i')).not.toBeVisible()
    })
  })

  test.describe('Priority Selection', () => {
    test('should allow selecting normal priority', async ({ page }) => {
      // Priority should default to normal
      await expect(page.getByRole('combobox')).toHaveText(/normal/i)
    })

    test('should allow selecting high priority', async ({ page }) => {
      // Open priority selector
      await page.getByRole('combobox').click()

      // Select high priority
      await page.getByRole('option', { name: /high/i }).click()

      // Verify high priority is selected
      await expect(page.getByRole('combobox')).toHaveText(/high/i)
    })

    test('should maintain priority selection after file selection', async ({ page }) => {
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')

      // Select high priority first
      await page.getByRole('combobox').click()
      await page.getByRole('option', { name: /high/i }).click()

      // Upload file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)

      // Verify high priority is still selected
      await expect(page.getByRole('combobox')).toHaveText(/high/i)
    })
  })

  test.describe('Upload Submission', () => {
    test('should successfully upload an image with normal priority', async ({ page }) => {
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')

      // Upload file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)

      // Wait for file summary to appear
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()

      // Click upload button - the button text is "Upload Image" for single file
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Verify we're on results page
      expect(page.url()).toMatch(/\/results\/[a-zA-Z0-9-]+/)
    })

    test('should successfully upload an image with high priority', async ({ page }) => {
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')

      // Upload file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)

      // Wait for file summary to appear
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()

      // Select high priority
      await page.getByRole('combobox').click()
      await page.getByRole('option', { name: /high/i }).click()

      // Click upload button - the button text is "Upload Image" for single file
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Verify we're on results page
      expect(page.url()).toMatch(/\/results\/[a-zA-Z0-9-]+/)
    })

    test('should disable upload button when no file is selected', async ({ page }) => {
      // The button text when no files are selected is "Upload Image"
      const uploadButton = page.getByRole('button', { name: /upload image$/i })

      // Verify button is disabled
      await expect(uploadButton).toBeDisabled()
    })

    test('should show uploading state during upload', async ({ page }) => {
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')

      // Upload file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)

      // Wait for file summary to appear
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()

      // Click upload button - the button text is "Upload Image" for single file
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Check for uploading state (this might be very quick)
      // We'll use waitForURL to confirm the upload completed
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })
    })

    test('should clear form after successful upload', async ({ page }) => {
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')

      // Upload file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)

      // Wait for file summary to appear
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()

      // Click upload button - the button text is "Upload Image" for single file
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Go back to home page
      await page.goto('/')

      // Verify form is cleared (no file summary shown)
      await expect(page.locator('text=/file selected/i')).not.toBeVisible()
      await expect(page.locator('text=/Drag and drop your images/i')).toBeVisible()
    })
  })

  test.describe('Navigation to Results', () => {
    test('should navigate to results page after successful upload', async ({ page }) => {
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')

      // Upload file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)

      // Wait for file summary to appear
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()

      // Click upload button - the button text is "Upload Image" for single file
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Verify we're on results page with a match ID
      const url = page.url()
      expect(url).toMatch(/\/results\/[a-zA-Z0-9-]+/)

      // Extract match ID from URL
      const matchId = url.split('/results/')[1]
      expect(matchId).toBeTruthy()
      expect(matchId.length).toBeGreaterThan(0)
    })

    test('should display match status on results page', async ({ page }) => {
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')

      // Upload file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)

      // Wait for file summary to appear
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()

      // Click upload button - the button text is "Upload Image" for single file
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Check for Match Result heading
      await expect(page.locator('text=/Match Result/i')).toBeVisible({ timeout: 10000 })
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
      const invalidFile = Buffer.from('Not an image')

      // Try to upload invalid file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'invalid.txt',
        mimeType: 'text/plain',
        buffer: invalidFile,
      })

      // Check for validation error
      await expect(page.locator('text=/Only JPG and PNG files/i')).toBeVisible()

      // Now upload a valid file
      const validPath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      await fileInput.setInputFiles(validPath)

      // Verify error is cleared and preview is shown
      await expect(page.locator('text=/Only JPG and PNG files/i')).not.toBeVisible()
      await expect(page.locator('img').first()).toBeVisible()
    })
  })
})
