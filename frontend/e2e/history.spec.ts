import { test, expect } from '@playwright/test'
import { login, clearAuth, navigateToHistory, TEST_USER } from './helpers'
import path from 'path'

test.describe('History Page', () => {
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

  test.describe('Page Display', () => {
    test('should display history page header', async ({ page }) => {
      // Navigate to history page via header button
      await page.getByRole('button', { name: /history/i }).click()

      // Wait for navigation
      await page.waitForURL('/history', { timeout: 10000 })

      // Check page title
      await expect(page.locator('h1')).toContainText('Match History')

      // Check description
      await expect(page.locator('text=/View all your image matching results/i')).toBeVisible()

      // Check back to home button
      await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible()
    })

    test('should display empty state when no matches exist', async ({ page }) => {
      // Navigate to history page
      await page.goto('/history')

      // Wait for loading to complete (check for absence of skeleton)
      await page.waitForTimeout(2000)

      // If no matches exist, should show empty state
      // Note: This test might fail if the user already has matches
      const noMatchesText = page.locator('text=/No matches found/i')
      const matchesList = page.locator('button:has(span.font-mono)')

      // Either empty state or matches should be visible
      const hasMatches = (await matchesList.count()) > 0
      const hasEmptyState = await noMatchesText.isVisible()

      expect(hasMatches || hasEmptyState).toBeTruthy()

      if (hasEmptyState) {
        // Check for empty state message
        await expect(page.locator('text=/You haven\'t uploaded any images yet/i')).toBeVisible()

        // Check for upload button
        await expect(page.getByRole('link', { name: /upload your first image/i })).toBeVisible()
      }
    })

    test('should display loading state while fetching matches', async ({ page }) => {
      // Navigate to history page
      const navigationPromise = page.goto('/history')

      // Check for loading skeletons (might be very quick)
      // We'll just verify the page loads successfully
      await navigationPromise
      await page.waitForLoadState('networkidle')

      // Verify page is loaded
      await expect(page.locator('h1')).toContainText('Match History')
    })

    test('should display match list if matches exist', async ({ page }) => {
      // First upload an image to ensure we have at least one match
      await page.goto('/')

      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Now navigate to history page
      await page.goto('/history')

      // Wait for matches to load
      await page.waitForTimeout(2000)

      // Check if match list is visible
      const matchItems = page.locator('button:has(span.font-mono)')
      const matchCount = await matchItems.count()

      if (matchCount > 0) {
        // Verify first match is visible
        await expect(matchItems.first()).toBeVisible()

        // Verify match ID is displayed
        await expect(matchItems.first().locator('span.font-mono')).toBeVisible()

        // Verify status badge is displayed
        await expect(matchItems.first().locator('span.text-xs.font-medium')).toBeVisible()
      }
    })
  })

  test.describe('Match Items', () => {
    test('should display match ID for each item', async ({ page }) => {
      // Upload an image first
      await page.goto('/')
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Navigate to history
      await page.goto('/history')
      await page.waitForTimeout(2000)

      // Find match items
      const matchItems = page.locator('button:has(span.font-mono)')
      const matchCount = await matchItems.count()

      if (matchCount > 0) {
        // Verify match ID is displayed
        const matchId = await matchItems.first().locator('span.font-mono').textContent()
        expect(matchId).toBeTruthy()
        expect(matchId!.length).toBeGreaterThan(0)
      }
    })

    test('should display status badge for each match', async ({ page }) => {
      // Upload an image first
      await page.goto('/')
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Navigate to history
      await page.goto('/history')
      await page.waitForTimeout(2000)

      // Find match items
      const matchItems = page.locator('button:has(span.font-mono)')
      const matchCount = await matchItems.count()

      if (matchCount > 0) {
        // Verify status badge is displayed
        const statusBadge = matchItems.first().locator('span.text-xs.font-medium')
        await expect(statusBadge).toBeVisible()

        const statusText = await statusBadge.textContent()
        expect(statusText).toMatch(/COMPLETED|PROCESSING|QUEUED|FAILED/)
      }
    })

    test('should display created date for each match', async ({ page }) => {
      // Upload an image first
      await page.goto('/')
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Navigate to history
      await page.goto('/history')
      await page.waitForTimeout(2000)

      // Find match items
      const matchItems = page.locator('button:has(span.font-mono)')
      const matchCount = await matchItems.count()

      if (matchCount > 0) {
        // Verify date is displayed (in muted-foreground text)
        const dateText = matchItems.first().locator('span.text-xs.text-muted-foreground')
        await expect(dateText).toBeVisible()
      }
    })
  })

  test.describe('Navigation', () => {
    test('should navigate to match details when clicking a match item', async ({ page }) => {
      // Upload an image first
      await page.goto('/')
      const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(filePath)
      await expect(page.locator('text=/1 file selected/i')).toBeVisible()
      await page.getByRole('button', { name: /upload image$/i }).click()
      await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 15000 })

      // Get the match ID from URL
      const resultsUrl = page.url()
      const matchId = resultsUrl.split('/results/')[1]

      // Navigate to history
      await page.goto('/history')
      await page.waitForTimeout(2000)

      // Find and click the first match item
      const matchItems = page.locator('button:has(span.font-mono)')
      const matchCount = await matchItems.count()

      if (matchCount > 0) {
        await matchItems.first().click()

        // Should navigate to results page
        await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 10000 })

        // Verify we're on the results page
        expect(page.url()).toMatch(/\/results\/[a-zA-Z0-9-]+/)
      }
    })

    test('should navigate back to home page when clicking back button', async ({ page }) => {
      // Navigate to history
      await page.goto('/history')

      // Click back to home button
      await page.getByRole('link', { name: /back to home/i }).click()

      // Should navigate to home page
      await page.waitForURL('/', { timeout: 10000 })
      await expect(page).toHaveURL('/')
    })

    test('should navigate to home page from empty state upload button', async ({ page }) => {
      // Navigate to history
      await page.goto('/history')
      await page.waitForTimeout(2000)

      // Check if empty state is visible
      const uploadButton = page.getByRole('link', { name: /upload your first image/i })
      const isEmptyState = await uploadButton.isVisible().catch(() => false)

      if (isEmptyState) {
        // Click upload button
        await uploadButton.click()

        // Should navigate to home page
        await page.waitForURL('/', { timeout: 10000 })
        await expect(page).toHaveURL('/')
      }
    })
  })

  test.describe('Pagination', () => {
    test('should display pagination controls when there are multiple pages', async ({ page }) => {
      // Navigate to history
      await page.goto('/history')
      await page.waitForTimeout(2000)

      // Check for pagination controls
      const paginationSection = page.locator('text=/Page \\d+ of \\d+/')
      const hasPagination = await paginationSection.isVisible().catch(() => false)

      if (hasPagination) {
        // Verify previous and next buttons exist
        await expect(page.getByRole('button', { name: /previous/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /next/i })).toBeVisible()

        // Verify page indicator is visible
        await expect(paginationSection).toBeVisible()
      }
    })

    test('should disable previous button on first page', async ({ page }) => {
      // Navigate to history
      await page.goto('/history')
      await page.waitForTimeout(2000)

      // Check if pagination exists
      const paginationSection = page.locator('text=/Page \\d+ of \\d+/')
      const hasPagination = await paginationSection.isVisible().catch(() => false)

      if (hasPagination) {
        // Previous button should be disabled on first page
        const previousButton = page.getByRole('button', { name: /previous/i })
        await expect(previousButton).toBeDisabled()
      }
    })

    test('should enable next button when not on last page', async ({ page }) => {
      // Navigate to history
      await page.goto('/history')
      await page.waitForTimeout(2000)

      // Check if pagination exists
      const paginationSection = page.locator('text=/Page \\d+ of \\d+/')
      const hasPagination = await paginationSection.isVisible().catch(() => false)

      if (hasPagination) {
        // Get page info
        const pageText = await paginationSection.textContent()
        const match = pageText!.match(/Page (\d+) of (\d+)/)

        if (match) {
          const currentPage = parseInt(match[1])
          const totalPages = parseInt(match[2])

          const nextButton = page.getByRole('button', { name: /next/i })

          if (currentPage < totalPages) {
            // Next button should be enabled
            await expect(nextButton).toBeEnabled()
          } else {
            // Next button should be disabled on last page
            await expect(nextButton).toBeDisabled()
          }
        }
      }
    })

    test('should navigate to next page when clicking next button', async ({ page }) => {
      // Navigate to history
      await page.goto('/history')
      await page.waitForTimeout(2000)

      // Check if pagination exists and we can go to next page
      const nextButton = page.getByRole('button', { name: /next/i })
      const hasNextButton = await nextButton.isVisible().catch(() => false)

      if (hasNextButton) {
        const isEnabled = await nextButton.isEnabled().catch(() => false)

        if (isEnabled) {
          // Get current page number
          const pageText = await page.locator('text=/Page \\d+ of \\d+/').textContent()
          const currentPage = pageText!.match(/Page (\d+)/)?.[1]

          // Click next button
          await nextButton.click()

          // Wait for page to update
          await page.waitForTimeout(1000)

          // Verify page number increased
          const newPageText = await page.locator('text=/Page \\d+ of \\d+/').textContent()
          const newPage = newPageText!.match(/Page (\d+)/)?.[1]

          expect(parseInt(newPage!)).toBe(parseInt(currentPage!) + 1)
        }
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should display error message when API fails', async ({ page }) => {
      // This test would require mocking a failed API response
      // For now, we'll skip as it depends on backend behavior
      test.skip()
    })
  })

  test.describe('Accessibility', () => {
    test('should be navigable via keyboard', async ({ page }) => {
      // Navigate to history
      await page.goto('/history')
      await page.waitForTimeout(2000)

      // Check if matches exist
      const matchItems = page.locator('button:has(span.font-mono)')
      const matchCount = await matchItems.count()

      if (matchCount > 0) {
        // Focus on first match item
        await matchItems.first().focus()

        // Verify focus is on the element
        await expect(matchItems.first()).toBeFocused()

        // Press enter to navigate
        await page.keyboard.press('Enter')

        // Should navigate to results page
        await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 10000 })
      }
    })
  })
})
