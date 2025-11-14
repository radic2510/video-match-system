import { test, expect } from '@playwright/test'

/**
 * Smoke tests to verify basic setup and connectivity
 */
test.describe('Smoke Tests', () => {
  test('should load the auth page', async ({ page }) => {
    await page.goto('/auth')

    // Check page title (it's in CardTitle, not h1)
    await expect(page.locator('text=Video Match System')).toBeVisible()

    // Check login/register tabs exist
    await expect(page.getByRole('tab', { name: 'Login' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Register' })).toBeVisible()
  })

  test('should redirect to auth when not logged in', async ({ page }) => {
    // Clear any existing auth
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())

    // Try to access home page
    await page.goto('/')

    // Should be redirected to auth page
    await page.waitForURL('/auth', { timeout: 10000 })
    await expect(page).toHaveURL('/auth')
  })

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/auth')

    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(viewport).toBeTruthy()
  })
})
