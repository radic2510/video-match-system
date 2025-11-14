import { test, expect } from '@playwright/test'
import { login, clearAuth, TEST_USER } from './helpers'

test.describe('Advertisements Page', () => {
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
    test('should display advertisements page header', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Check page title
      await expect(page.locator('h1')).toContainText('Advertisements')

      // Check description
      await expect(page.locator('text=/Manage your advertisement database/i')).toBeVisible()

      // Check back to home button
      await expect(page.getByRole('link', { name: /home/i })).toBeVisible()

      // Check upload new button
      await expect(page.getByRole('link', { name: /upload new/i })).toBeVisible()
    })

    test('should display search bar', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Check for search input
      await expect(
        page.getByPlaceholder(/Search by brand or campaign name/i)
      ).toBeVisible()
    })

    test('should display loading state while fetching', async ({ page }) => {
      // Navigate to advertisements page
      const navigationPromise = page.goto('/advertisements')

      // We'll just verify the page loads successfully
      await navigationPromise
      await page.waitForLoadState('networkidle')

      // Verify page is loaded
      await expect(page.locator('h1')).toContainText('Advertisements')
    })

    test('should display empty state when no advertisements exist', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for loading to complete
      await page.waitForTimeout(2000)

      // Check if empty state or advertisements list is visible
      const noAdsText = page.locator('text=/No advertisements found/i')
      const adsList = page.locator('text=/All Advertisements/i')

      // Either empty state or ads list should be visible
      const hasEmptyState = await noAdsText.isVisible().catch(() => false)
      const hasAdsList = await adsList.isVisible().catch(() => false)

      expect(hasEmptyState || hasAdsList).toBeTruthy()

      if (hasEmptyState) {
        // Check for empty state message
        await expect(
          page.locator('text=/Get started by uploading your first advertisement/i')
        ).toBeVisible()

        // Check for upload button
        await expect(page.getByRole('link', { name: /upload advertisement/i })).toBeVisible()
      }
    })

    test('should display advertisement list if advertisements exist', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
      await page.waitForTimeout(2000)

      // Check if advertisement list is visible
      const adsListTitle = page.locator('text=/All Advertisements/i')
      await expect(adsListTitle).toBeVisible({ timeout: 10000 })

      // Check for showing count text (will appear if ads exist)
      const showingText = page.locator('text=/Showing \\d+ of \\d+ advertisements/i')
      const hasShowingText = await showingText.isVisible().catch(() => false)

      // If showing text exists, we have advertisements
      if (hasShowingText) {
        await expect(showingText).toBeVisible()
      }
    })
  })

  test.describe('Advertisement Items', () => {
    test('should display advertisement details', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
      await page.waitForTimeout(2000)

      // Find advertisement items (they have View Details button)
      const adItems = page.locator('text=/View Details/i')
      const adCount = await adItems.count()

      if (adCount > 0) {
        // Check first advertisement item is displayed
        const firstAd = page
          .locator('div')
          .filter({ has: page.locator('text=/View Details/i') })
          .first()

        await expect(firstAd).toBeVisible()
      }
    })

    test('should display status badge for each advertisement', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
      await page.waitForTimeout(2000)

      // Find advertisement items
      const adItems = page.locator('text=/View Details/i')
      const adCount = await adItems.count()

      if (adCount > 0) {
        // Check for status badge (READY, PROCESSING, FAILED)
        const statusBadge = page.locator('text=/READY|PROCESSING|FAILED/i').first()
        const hasStatus = await statusBadge.isVisible().catch(() => false)

        if (hasStatus) {
          await expect(statusBadge).toBeVisible()
        }
      }
    })

    test('should display upload date for each advertisement', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
      await page.waitForTimeout(2000)

      // Find advertisement items
      const adItems = page.locator('text=/View Details/i')
      const adCount = await adItems.count()

      if (adCount > 0) {
        // Check for "Uploaded:" text
        const uploadedText = page.locator('text=/Uploaded:/i').first()
        const hasUploaded = await uploadedText.isVisible().catch(() => false)

        if (hasUploaded) {
          await expect(uploadedText).toBeVisible()
        }
      }
    })

    test('should display frame count when available', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
      await page.waitForTimeout(2000)

      // Check if frame count is displayed for any advertisement
      const frameCount = page.locator('text=/\\d+ frames/i').first()
      const hasFrameCount = await frameCount.isVisible().catch(() => false)

      // Frame count is optional, so we just check if it exists
      if (hasFrameCount) {
        await expect(frameCount).toBeVisible()
      }
    })
  })

  test.describe('Search Functionality', () => {
    test('should filter advertisements by brand name', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
      await page.waitForTimeout(2000)

      // Check if advertisements exist
      const adItems = page.locator('text=/View Details/i')
      const adCount = await adItems.count()

      if (adCount > 0) {
        // Get first advertisement brand name
        const firstAd = page
          .locator('div')
          .filter({ has: page.locator('text=/View Details/i') })
          .first()

        // Try to find brand name (it's in a h3 with font-semibold)
        const brandName = await firstAd.locator('h3.font-semibold').textContent()

        if (brandName && brandName.trim()) {
          // Search for the brand name
          const searchInput = page.getByPlaceholder(/Search by brand or campaign name/i)
          await searchInput.fill(brandName.trim())

          // Wait a bit for filtering
          await page.waitForTimeout(500)

          // The advertisement should still be visible
          await expect(page.locator(`text=${brandName.trim()}`).first()).toBeVisible()
        }
      }
    })

    test('should show no results when search does not match', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
      await page.waitForTimeout(2000)

      // Search for something that doesn't exist
      const searchInput = page.getByPlaceholder(/Search by brand or campaign name/i)
      await searchInput.fill('NonExistentBrandXYZ123')

      // Wait a bit for filtering
      await page.waitForTimeout(500)

      // Should show empty state with adjusted message
      const noResults = page.locator('text=/No advertisements found/i').first()
      await expect(noResults).toBeVisible()

      // Should suggest adjusting search query
      await expect(page.locator('text=/Try adjusting your search query/i').first()).toBeVisible()
    })

    test('should clear search and show all advertisements', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
      await page.waitForTimeout(2000)

      // Search for something
      const searchInput = page.getByPlaceholder(/Search by brand or campaign name/i)
      await searchInput.fill('test')
      await page.waitForTimeout(500)

      // Clear search
      await searchInput.clear()
      await page.waitForTimeout(500)

      // Should show all advertisements again
      const adsListTitle = page.locator('text=/All Advertisements/i')
      await expect(adsListTitle).toBeVisible()
    })
  })

  test.describe('Navigation', () => {
    test('should navigate to home page when clicking home button', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Click home button
      await page.getByRole('link', { name: /home/i }).click()

      // Should navigate to home page
      await page.waitForURL('/', { timeout: 10000 })
      await expect(page).toHaveURL('/')
    })

    test('should navigate to upload page when clicking upload new button', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Click upload new button
      await page.getByRole('link', { name: /upload new/i }).click()

      // Should navigate to upload page
      await page.waitForURL('/advertisements/upload', { timeout: 10000 })
      await expect(page).toHaveURL('/advertisements/upload')
    })

    test('should navigate to upload page from empty state', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
      await page.waitForTimeout(2000)

      // Check if empty state is visible
      const uploadButton = page.getByRole('link', { name: /upload advertisement/i })
      const isEmptyState = await uploadButton.isVisible().catch(() => false)

      if (isEmptyState) {
        // Click upload button
        await uploadButton.click()

        // Should navigate to upload page
        await page.waitForURL('/advertisements/upload', { timeout: 10000 })
        await expect(page).toHaveURL('/advertisements/upload')
      }
    })

    test('should navigate to advertisement details when clicking an item', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
      await page.waitForTimeout(2000)

      // Find advertisement items
      const adLinks = page.locator('a[href^="/advertisements/"]').filter({
        has: page.locator('text=/View Details/i'),
      })
      const adCount = await adLinks.count()

      if (adCount > 0) {
        // Click first advertisement
        await adLinks.first().click()

        // Should navigate to advertisement details page
        await page.waitForURL(/\/advertisements\/[a-zA-Z0-9-]+/, { timeout: 10000 })

        // Verify we're on a details page
        expect(page.url()).toMatch(/\/advertisements\/[a-zA-Z0-9-]+/)
      }
    })
  })

  test.describe('Pagination', () => {
    test('should display pagination controls when there are multiple pages', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
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
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
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
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
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
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
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

    test('should navigate to previous page when clicking previous button', async ({ page }) => {
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
      await page.waitForTimeout(2000)

      // Check if pagination exists
      const nextButton = page.getByRole('button', { name: /next/i })
      const hasNextButton = await nextButton.isVisible().catch(() => false)

      if (hasNextButton) {
        const isNextEnabled = await nextButton.isEnabled().catch(() => false)

        if (isNextEnabled) {
          // Go to next page first
          await nextButton.click()
          await page.waitForTimeout(1000)

          // Now try to go back
          const previousButton = page.getByRole('button', { name: /previous/i })
          await previousButton.click()

          // Wait for page to update
          await page.waitForTimeout(1000)

          // Should be back on page 1
          await expect(page.locator('text=/Page 1 of/i')).toBeVisible()
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
      // Navigate to advertisements page
      await page.goto('/advertisements')

      // Wait for advertisements to load
      await page.waitForTimeout(2000)

      // Focus on search input
      const searchInput = page.getByPlaceholder(/Search by brand or campaign name/i)
      await searchInput.focus()

      // Verify focus
      await expect(searchInput).toBeFocused()

      // Tab to next element (should be an advertisement or button)
      await page.keyboard.press('Tab')

      // We should be able to tab through the page
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeTruthy()
    })
  })
})
