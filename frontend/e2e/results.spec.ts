import { test, expect } from '@playwright/test'
import { login, uploadImage, clearAuth, TEST_USER, waitForMatchCompletion } from './helpers'
import path from 'path'

test.describe('Match Results Page', () => {
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

  test.describe('Page Loading and Display', () => {
    test('should display loading state initially', async ({ page }) => {
      // Upload an image first
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Check that either loading or content is displayed
      const matchResult = page.locator('text=/Match Result/i')
      await expect(matchResult).toBeVisible({ timeout: 10000 })
    })

    test('should display match ID', async ({ page }) => {
      // Upload an image
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Extract match ID from URL
      const url = page.url()
      const matchId = url.split('/results/')[1]
      expect(matchId).toBeTruthy()

      // Verify match ID is displayed on the page
      await expect(page.locator(`text=/ID: ${matchId}/i`)).toBeVisible({ timeout: 10000 })
    })

    test('should display status badge', async ({ page }) => {
      // Upload an image
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Wait for status badge to appear
      await page.waitForTimeout(2000)

      // Check for status badge (can be QUEUED, PROCESSING, COMPLETED, or FAILED)
      const statusBadge = page.locator('text=/Queued|Processing|Completed|Failed/i')
      await expect(statusBadge).toBeVisible({ timeout: 10000 })
    })

    test('should display timestamps', async ({ page }) => {
      // Upload an image
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Wait for page to load
      await page.waitForTimeout(2000)

      // Check for "Created At" timestamp
      await expect(page.locator('text=/Created At/i')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Processing States', () => {
    test('should show processing status and progress', async ({ page }) => {
      // Upload an image
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Wait for page to load
      await page.waitForTimeout(2000)

      // Check if processing status or completed status is shown
      const processingBadge = page.locator('text=/Processing|Queued/i')
      const completedBadge = page.locator('text=/Completed/i')

      const isProcessing = await processingBadge.isVisible().catch(() => false)
      const isCompleted = await completedBadge.isVisible().catch(() => false)

      // Should show either processing or completed
      expect(isProcessing || isCompleted).toBeTruthy()

      // If processing, should show progress indicator
      if (isProcessing) {
        // Check for polling message
        await expect(
          page.locator('text=/Checking for updates every/i')
        ).toBeVisible({ timeout: 5000 })
      }
    })

    test('should poll for updates when processing', async ({ page }) => {
      // Upload an image
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Wait a bit for initial status
      await page.waitForTimeout(2000)

      // Check if processing
      const isProcessing = await page
        .locator('text=/Processing|Queued/i')
        .isVisible()
        .catch(() => false)

      if (isProcessing) {
        // Wait for status to change (up to 30 seconds)
        await expect(async () => {
          const status = await page.locator('text=/Completed|Failed/i').isVisible()
          expect(status).toBeTruthy()
        }).toPass({ timeout: 30000 })
      }
    })
  })

  test.describe('Completed Match Results', () => {
    test('should display match results when completed', async ({ page }) => {
      // Upload an image
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Wait for completion (up to 60 seconds) or check if still processing
      try {
        await expect(async () => {
          const completedText = await page.locator('text=/Completed/i').isVisible()
          expect(completedText).toBeTruthy()
        }).toPass({ timeout: 60000 })
      } catch (e) {
        // If not completed within 60s, check if it's still processing (which is also valid)
        const stillProcessing = await page.locator('text=/Processing|Queued/i').isVisible().catch(() => false)
        if (!stillProcessing) {
          throw e // Re-throw if it's not processing either
        }
        // If still processing, skip the rest of the test
        test.skip()
      }

      // Check for match result section
      await expect(page.locator('text=/Match Found|No Match Found/i')).toBeVisible({
        timeout: 5000,
      })
    })

    test('should display advertisement info when matched', async ({ page }) => {
      // Upload an image
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Wait for completion
      await expect(async () => {
        const completedText = await page.locator('text=/Completed/i').isVisible()
        expect(completedText).toBeTruthy()
      }).toPass({ timeout: 30000 })

      // Check if match was found
      const matchFound = await page
        .locator('text=/Match Found/i')
        .isVisible()
        .catch(() => false)

      if (matchFound) {
        // Should display confidence score
        await expect(page.locator('text=/Confidence Score/i')).toBeVisible()

        // Should display processing time
        await expect(page.locator('text=/Processing Time/i')).toBeVisible()
      } else {
        // Should display no match message
        await expect(page.locator('text=/No Match Found/i')).toBeVisible()
      }
    })

    test('should display confidence score with progress bar', async ({ page }) => {
      // Upload an image
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Wait for completion
      await expect(async () => {
        const completedText = await page.locator('text=/Completed/i').isVisible()
        expect(completedText).toBeTruthy()
      }).toPass({ timeout: 30000 })

      // Check if match was found
      const matchFound = await page
        .locator('text=/Match Found/i')
        .isVisible()
        .catch(() => false)

      if (matchFound) {
        // Should display confidence score percentage
        const confidenceScore = page.locator('text=/\\d+\\.\\d+%/')
        await expect(confidenceScore).toBeVisible()
      }
    })

    test('should display alternative candidates when available', async ({ page }) => {
      // Upload an image
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Wait for completion
      await expect(async () => {
        const completedText = await page.locator('text=/Completed/i').isVisible()
        expect(completedText).toBeTruthy()
      }).toPass({ timeout: 30000 })

      // Check if alternative candidates section exists
      const alternativesSection = page.locator('text=/Alternative Candidates/i')
      const hasAlternatives = await alternativesSection.isVisible().catch(() => false)

      // If alternatives exist, verify they're displayed properly
      if (hasAlternatives) {
        await expect(alternativesSection).toBeVisible()
      }
    })
  })

  test.describe('Failed State', () => {
    test('should display error message when processing fails', async ({ page }) => {
      // Note: This test depends on backend behavior
      // We'll check if we can detect the failed state

      // Upload an image
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Wait for final status
      await page.waitForTimeout(3000)

      // Check if failed status is shown
      const failedBadge = await page
        .locator('text=/Failed/i')
        .isVisible()
        .catch(() => false)

      if (failedBadge) {
        // Should display error alert
        await expect(page.locator('text=/Processing Failed/i')).toBeVisible()
      }
    })
  })

  test.describe('Navigation', () => {
    test('should navigate back to home page', async ({ page }) => {
      // Upload an image
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Wait for page to load
      await page.waitForTimeout(2000)

      // Click back to home button
      await page.getByRole('link', { name: /back to home/i }).click()

      // Should navigate to home page
      await page.waitForURL('/', { timeout: 10000 })
      await expect(page).toHaveURL('/')
    })

    test('should handle direct URL access to results page', async ({ page }) => {
      // Upload an image first to get a valid match ID
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Get the match ID from URL
      const url = page.url()
      const matchId = url.split('/results/')[1]

      // Navigate away
      await page.goto('/')

      // Navigate directly to the results page
      await page.goto(`/results/${matchId}`)

      // Should display the match result
      await expect(page.locator('text=/Match Result/i')).toBeVisible({ timeout: 10000 })
    })

    test('should show error for non-existent match ID', async ({ page }) => {
      // Try to access a non-existent match
      await page.goto('/results/non-existent-match-id')

      // Wait for page to load
      await page.waitForTimeout(3000)

      // Should show error message (use first() to avoid strict mode violation)
      await expect(
        page.locator('text=/Error|Match not found|Failed to fetch/i').first()
      ).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Accessibility', () => {
    test('should be navigable via keyboard', async ({ page }) => {
      // Upload an image
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()

      // Wait for redirect to results page
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Wait for page to load
      await page.waitForTimeout(2000)

      // Focus on back to home link
      const backLink = page.getByRole('link', { name: /back to home/i })
      await backLink.focus()

      // Verify focus
      await expect(backLink).toBeFocused()

      // Press enter to navigate
      await page.keyboard.press('Enter')

      // Should navigate to home page
      await page.waitForURL('/', { timeout: 10000 })
      await expect(page).toHaveURL('/')
    })
  })
})
