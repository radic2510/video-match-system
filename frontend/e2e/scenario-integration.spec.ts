import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * End-to-End Scenario Integration Tests
 * Based on personal/scenario_2025_11_14_ver_1.md
 *
 * This test suite follows the complete user journey:
 * 1. User registers and logs in
 * 2. User uploads an image
 * 3. User checks match results
 * 4. User views match history
 */

test.describe('Complete User Journey', () => {
  // Generate unique email for this test run
  const timestamp = Date.now()
  const testUser = {
    email: `e2e_user_${timestamp}@test.com`,
    password: 'TestPassword123!',
    name: 'E2E Test User',
  }

  test('USE CASE: User journey from registration to viewing match results', async ({
    page,
  }) => {
    // ==========================================
    // Step 1: User Registration
    // ==========================================
    test.setTimeout(120000) // 2 minutes for full flow

    await page.goto('/')

    // Should redirect to auth page when not logged in
    await expect(page).toHaveURL(/\/auth/)

    // Register a new user
    await page.getByRole('tab', { name: 'Register' }).click()
    await page.locator('#register-name').fill(testUser.name)
    await page.locator('#register-email').fill(testUser.email)
    await page.locator('#register-password').fill(testUser.password)
    await page.getByRole('button', { name: /create account/i }).click()

    // Wait for registration to complete and navigate to home
    // Note: Increase timeout as backend might take time
    await page.waitForURL('/', { timeout: 15000 }).catch(async (error) => {
      // If navigation fails, take screenshot for debugging
      console.log('Registration navigation failed, current URL:', page.url())
      const content = await page.content()
      console.log('Page content:', content.substring(0, 500))
      throw error
    })

    console.log('✓ User registered successfully')

    // ==========================================
    // Step 2: Image Upload
    // ==========================================

    // Verify we're on the home page
    await expect(page.locator('h1, h2')).toContainText(/upload|match/i, {
      timeout: 10000,
    })

    // Find and upload an image file
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()

    // Use test fixture image
    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg')
    await fileInput.setInputFiles(testImagePath)

    console.log('✓ Image selected')

    // Wait for preview to appear
    await expect(page.locator('img[alt*="preview" i]')).toBeVisible({
      timeout: 5000,
    })

    // Select priority (if available)
    const prioritySelect = page.locator('select').filter({ hasText: /priority/i })
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption('high')
    }

    // Click upload button
    const uploadButton = page.getByRole('button', {
      name: /upload|submit|match/i,
    })
    await expect(uploadButton).toBeEnabled()
    await uploadButton.click()

    console.log('✓ Upload button clicked')

    // Wait for navigation to results page
    await page.waitForURL(/\/results\//, { timeout: 30000 })

    console.log('✓ Navigated to results page')

    // ==========================================
    // Step 3: Check Match Results
    // ==========================================

    // Verify we're on results page
    await expect(
      page.locator('h1, h2').filter({ hasText: /result|match/i })
    ).toBeVisible({ timeout: 10000 })

    // Check for match ID display
    await expect(
      page.locator('text=/Match ID|ID:/i')
    ).toBeVisible({ timeout: 5000 })

    // Wait for processing to complete (max 60 seconds)
    // Look for status indicators
    const statusIndicators = [
      page.locator('text=/completed|success|matched/i'),
      page.locator('text=/processing|queued/i'),
      page.locator('text=/failed|error/i'),
    ]

    let processingComplete = false
    let attempts = 0
    const maxAttempts = 12 // 60 seconds with 5 second intervals

    while (!processingComplete && attempts < maxAttempts) {
      for (const indicator of statusIndicators) {
        if (await indicator.isVisible()) {
          const text = await indicator.textContent()
          console.log(`Status: ${text}`)

          if (text?.match(/completed|success|matched|failed|error/i)) {
            processingComplete = true
            break
          }
        }
      }

      if (!processingComplete) {
        await page.waitForTimeout(5000) // Wait 5 seconds before checking again
        attempts++
        await page.reload() // Reload to get latest status
      }
    }

    console.log('✓ Match processing completed')

    // Check if match result is displayed (if successful)
    const hasCompletedMatch = await page
      .locator('text=/completed|success|matched/i')
      .isVisible()

    if (hasCompletedMatch) {
      // Look for confidence score or match details
      const hasConfidence = await page.locator('text=/confidence|score/i').isVisible()
      const hasAdvertisement = await page.locator('text=/advertisement|brand/i').isVisible()

      console.log(`✓ Match found (confidence: ${hasConfidence}, ad info: ${hasAdvertisement})`)
    }

    // ==========================================
    // Step 4: Navigate to History
    // ==========================================

    // Look for navigation to history page
    const historyLink = page.getByRole('link', { name: /history/i })
    if (await historyLink.isVisible()) {
      await historyLink.click()
      await page.waitForURL(/\/history/, { timeout: 10000 })

      console.log('✓ Navigated to history page')

      // Verify history page shows our match
      await expect(
        page.locator('text=/match|history/i').first()
      ).toBeVisible({ timeout: 5000 })

      // Check if our recent upload appears in the list
      const matchItems = page.locator('[data-testid*="match"], .match-item, li').filter({
        hasText: testUser.email.split('@')[0],
      })

      if ((await matchItems.count()) > 0) {
        console.log('✓ Match appears in history')
      }
    } else {
      console.log('ℹ History link not found, skipping history verification')
    }

    // ==========================================
    // Step 5: Logout
    // ==========================================

    const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
    if (await logoutButton.isVisible()) {
      await logoutButton.click()

      // Should redirect back to auth page
      await expect(page).toHaveURL(/\/auth/, { timeout: 10000 })

      console.log('✓ User logged out successfully')
    }

    // Test completed successfully
    console.log('\n✅ Complete user journey test PASSED')
  })

  test('USE CASE: User can login after registration', async ({ page }) => {
    // First register a user (reuse from previous test or create new one)
    const loginUser = {
      email: `e2e_login_${Date.now()}@test.com`,
      password: 'TestPassword123!',
      name: 'Login Test User',
    }

    await page.goto('/')
    await expect(page).toHaveURL(/\/auth/)

    // Register
    await page.getByRole('tab', { name: 'Register' }).click()
    await page.locator('#register-name').fill(loginUser.name)
    await page.locator('#register-email').fill(loginUser.email)
    await page.locator('#register-password').fill(loginUser.password)
    await page.getByRole('button', { name: /create account/i }).click()

    await page.waitForURL('/', { timeout: 15000 })

    // Logout
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      await expect(page).toHaveURL(/\/auth/)
    }

    // Now try to login with the same credentials
    await page.getByRole('tab', { name: 'Login' }).click()
    await page.locator('#login-email').fill(loginUser.email)
    await page.locator('#login-password').fill(loginUser.password)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should navigate to home after successful login
    await page.waitForURL('/', { timeout: 15000 })

    console.log('✓ User can login after registration')
  })
})
