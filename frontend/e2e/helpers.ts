import { Page, expect } from '@playwright/test'
import path from 'path'

/**
 * Test credentials
 */
export const TEST_USER = {
  email: 'frontend_test_12345@example.com',
  password: 'Test1234Pass',
  name: 'Test User',
}

/**
 * Helper function to log in a user
 * @param page - Playwright page object
 * @param email - User email (defaults to test user email)
 * @param password - User password (defaults to test user password)
 */
export async function login(
  page: Page,
  email: string = TEST_USER.email,
  password: string = TEST_USER.password
) {
  // Navigate to auth page
  await page.goto('/auth')

  // Wait for page to load
  await expect(page.locator('text=Video Match System')).toBeVisible()

  // Ensure we're on the login tab
  await page.getByRole('tab', { name: 'Login' }).click()

  // Fill in login form
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)

  // Submit form
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for navigation to home page
  await page.waitForURL('/', { timeout: 10000 })

  // Verify we're logged in by checking for logout button
  await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()
}

/**
 * Helper function to register a new user
 * @param page - Playwright page object
 * @param name - User name
 * @param email - User email
 * @param password - User password
 */
export async function register(
  page: Page,
  name: string,
  email: string,
  password: string
) {
  // Navigate to auth page
  await page.goto('/auth')

  // Wait for page to load
  await expect(page.locator('text=Video Match System')).toBeVisible()

  // Switch to register tab
  await page.getByRole('tab', { name: 'Register' }).click()

  // Fill in registration form
  await page.locator('#register-name').fill(name)
  await page.locator('#register-email').fill(email)
  await page.locator('#register-password').fill(password)

  // Submit form
  await page.getByRole('button', { name: /create account/i }).click()

  // Wait for navigation to home page
  await page.waitForURL('/', { timeout: 10000 })

  // Verify we're logged in
  await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()
}

/**
 * Helper function to log out a user
 * @param page - Playwright page object
 */
export async function logout(page: Page) {
  // Click logout button
  await page.getByRole('button', { name: /logout/i }).click()

  // Wait for navigation to auth page
  await page.waitForURL('/auth', { timeout: 10000 })

  // Verify we're on the auth page
  await expect(page.locator('text=Video Match System')).toBeVisible()
}

/**
 * Helper function to upload an image
 * @param page - Playwright page object
 * @param filename - Name of the test image file in e2e/fixtures
 * @param priority - Upload priority (low, normal, high)
 */
export async function uploadImage(
  page: Page,
  filename: string = 'test-image.jpg',
  priority: string = 'normal'
) {
  // Get the file path
  const filePath = path.join(__dirname, 'fixtures', filename)

  // Find the file input
  const fileInput = page.locator('input[type="file"]')

  // Upload the file
  await fileInput.setInputFiles(filePath)

  // Wait for image preview to appear
  await expect(page.locator('img[alt*="Preview"]')).toBeVisible({ timeout: 5000 })

  // Select priority if not normal
  if (priority !== 'normal') {
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: priority, exact: true }).click()
  }

  // Click upload button
  await page.getByRole('button', { name: /upload/i }).click()

  // Wait for redirect to results page or processing status
  await page.waitForURL(/\/results\/[a-zA-Z0-9-]+/, { timeout: 10000 })
}

/**
 * Helper function to wait for match processing to complete
 * @param page - Playwright page object
 * @param timeout - Maximum wait time in milliseconds
 */
export async function waitForMatchCompletion(page: Page, timeout: number = 30000) {
  // Wait for either COMPLETED or FAILED status
  const statusLocator = page.locator('text=/Status:.*/')

  await expect(async () => {
    const statusText = await statusLocator.textContent()
    expect(statusText).toMatch(/COMPLETED|FAILED/)
  }).toPass({ timeout })
}

/**
 * Helper function to navigate to history page
 * @param page - Playwright page object
 */
export async function navigateToHistory(page: Page) {
  await page.getByRole('button', { name: /history/i }).click()
  await page.waitForURL('/history', { timeout: 10000 })
  await expect(page.locator('h1')).toContainText('Match History')
}

/**
 * Helper function to clear local storage (simulates logout without UI)
 * @param page - Playwright page object
 */
export async function clearAuth(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('auth_token')
  })
}

/**
 * Helper function to set authentication token directly
 * @param page - Playwright page object
 * @param token - JWT token
 */
export async function setAuthToken(page: Page, token: string) {
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token)
  }, token)
}

/**
 * Helper function to get authentication token from local storage
 * @param page - Playwright page object
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem('auth_token'))
}

/**
 * Helper function to create a fake image file for testing
 * @param filename - Name of the file
 * @param sizeKB - Size of the file in kilobytes
 */
export function createFakeImage(filename: string, sizeKB: number = 100): Buffer {
  // Create a simple buffer with the specified size
  const buffer = Buffer.alloc(sizeKB * 1024)

  // Fill with some data to make it realistic
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.floor(Math.random() * 256)
  }

  return buffer
}

/**
 * Helper function to wait for API response
 * @param page - Playwright page object
 * @param urlPattern - URL pattern to match
 */
export async function waitForAPIResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(
    (response) => {
      const url = response.url()
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern)
      }
      return urlPattern.test(url)
    },
    { timeout: 10000 }
  )
}

/**
 * Helper function to check if element exists (without throwing)
 * @param page - Playwright page object
 * @param selector - CSS selector
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout: 1000, state: 'attached' })
    return true
  } catch {
    return false
  }
}
