import { test, expect } from '@playwright/test'
import { login, logout, register, clearAuth, TEST_USER } from './helpers'

test.describe('Authentication Flow', () => {
  // Run before each test
  test.beforeEach(async ({ page }) => {
    // Clear any existing authentication
    await page.goto('/')
    await clearAuth(page)
  })

  test.describe('User Registration', () => {
    test('should successfully register a new user', async ({ page }) => {
      // Generate unique email for this test
      const timestamp = Date.now()
      const testEmail = `test_user_${timestamp}@example.com`
      const testName = 'Test User'
      const testPassword = 'TestPass123'

      // Navigate to auth page
      await page.goto('/auth')

      // Switch to register tab
      await page.getByRole('tab', { name: 'Register' }).click()

      // Fill in registration form
      await page.locator('#register-name').fill(testName)
      await page.locator('#register-email').fill(testEmail)
      await page.locator('#register-password').fill(testPassword)

      // Submit form
      await page.getByRole('button', { name: /create account/i }).click()

      // Wait for navigation to home page
      await page.waitForURL('/', { timeout: 10000 })

      // Verify we're logged in by checking for welcome message
      await expect(page.locator('text=/Welcome back/i')).toBeVisible()

      // Verify logout button is visible
      await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()
    })

    test('should show validation error for invalid email', async ({ page }) => {
      await page.goto('/auth')

      // Switch to register tab
      await page.getByRole('tab', { name: 'Register' }).click()

      // Fill with invalid email
      await page.locator('#register-name').fill('Test User')
      await page.locator('#register-email').fill('invalid-email')
      await page.locator('#register-password').fill('TestPass123')

      // Submit form
      await page.getByRole('button', { name: /create account/i }).click()

      // Check for validation error
      await expect(page.locator('text=/valid email/i')).toBeVisible()
    })

    test('should show validation error for short password', async ({ page }) => {
      await page.goto('/auth')

      // Switch to register tab
      await page.getByRole('tab', { name: 'Register' }).click()

      // Fill with short password
      await page.locator('#register-name').fill('Test User')
      await page.locator('#register-email').fill('test@example.com')
      await page.locator('#register-password').fill('12345')

      // Submit form
      await page.getByRole('button', { name: /create account/i }).click()

      // Check for validation error
      await expect(page.locator('text=/at least 6 characters/i')).toBeVisible()
    })

    test('should show validation error for missing name', async ({ page }) => {
      await page.goto('/auth')

      // Switch to register tab
      await page.getByRole('tab', { name: 'Register' }).click()

      // Fill without name
      await page.locator('#register-email').fill('test@example.com')
      await page.locator('#register-password').fill('TestPass123')

      // Submit form
      await page.getByRole('button', { name: /create account/i }).click()

      // Check for validation error
      await expect(page.locator('text=/name is required/i')).toBeVisible()
    })
  })

  test.describe('User Login', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      // Use helper function to login
      await login(page, TEST_USER.email, TEST_USER.password)

      // Verify we're on the home page
      await expect(page).toHaveURL('/')

      // Verify user is logged in
      await expect(page.locator('text=/Welcome back/i')).toBeVisible()
      await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()
    })

    test('should show error for invalid email format', async ({ page }) => {
      await page.goto('/auth')

      // Ensure we're on the login tab
      await page.getByRole('tab', { name: 'Login' }).click()

      // Fill with invalid email
      await page.locator('#login-email').fill('invalid-email')
      await page.locator('#login-password').fill('TestPass123')

      // Submit form
      await page.getByRole('button', { name: /sign in/i }).click()

      // Check for validation error
      await expect(page.locator('text=/valid email/i')).toBeVisible()
    })

    test('should show error for short password', async ({ page }) => {
      await page.goto('/auth')

      // Ensure we're on the login tab
      await page.getByRole('tab', { name: 'Login' }).click()

      // Fill with short password
      await page.locator('#login-email').fill('test@example.com')
      await page.locator('#login-password').fill('12345')

      // Submit form
      await page.getByRole('button', { name: /sign in/i }).click()

      // Check for validation error
      await expect(page.locator('text=/at least 6 characters/i')).toBeVisible()
    })

    test('should show error for incorrect credentials', async ({ page }) => {
      await page.goto('/auth')

      // Ensure we're on the login tab
      await page.getByRole('tab', { name: 'Login' }).click()

      // Fill with incorrect credentials
      await page.locator('#login-email').fill('wrong@example.com')
      await page.locator('#login-password').fill('WrongPass123')

      // Submit form
      await page.getByRole('button', { name: /sign in/i }).click()

      // Wait for error message
      // Note: This depends on backend returning proper error
      await expect(
        page.locator('text=/invalid|incorrect|authentication/i')
      ).toBeVisible({ timeout: 5000 })
    })

    test('should persist login state after page reload', async ({ page }) => {
      // Login first
      await login(page, TEST_USER.email, TEST_USER.password)

      // Reload the page
      await page.reload()

      // Verify user is still logged in
      await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()
      await expect(page.locator('text=/Welcome back/i')).toBeVisible()
    })
  })

  test.describe('User Logout', () => {
    test('should successfully logout', async ({ page }) => {
      // Login first
      await login(page, TEST_USER.email, TEST_USER.password)

      // Verify we're logged in
      await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()

      // Logout
      await logout(page)

      // Verify we're on the auth page
      await expect(page).toHaveURL('/auth')

      // Verify login form is visible
      await expect(page.getByRole('tab', { name: 'Login' })).toBeVisible()
    })

    test('should redirect to auth page when accessing protected route after logout', async ({
      page,
    }) => {
      // Login first
      await login(page, TEST_USER.email, TEST_USER.password)

      // Logout
      await logout(page)

      // Try to access home page
      await page.goto('/')

      // Should be redirected to auth page
      await expect(page).toHaveURL('/auth')
    })

    test('should clear authentication token on logout', async ({ page }) => {
      // Login first
      await login(page, TEST_USER.email, TEST_USER.password)

      // Check token exists
      const tokenBefore = await page.evaluate(() => localStorage.getItem('auth_token'))
      expect(tokenBefore).toBeTruthy()

      // Logout
      await logout(page)

      // Check token is removed
      const tokenAfter = await page.evaluate(() => localStorage.getItem('auth_token'))
      expect(tokenAfter).toBeNull()
    })
  })

  test.describe('Tab Switching', () => {
    test('should clear errors when switching between login and register tabs', async ({
      page,
    }) => {
      await page.goto('/auth')

      // Try to login with invalid data
      await page.locator('#login-email').fill('invalid')
      await page.getByRole('button', { name: /sign in/i }).click()

      // Verify error is shown
      await expect(page.locator('text=/valid email/i')).toBeVisible()

      // Switch to register tab
      await page.getByRole('tab', { name: 'Register' }).click()

      // Switch back to login tab
      await page.getByRole('tab', { name: 'Login' }).click()

      // Error should be cleared
      await expect(page.locator('text=/valid email/i')).not.toBeVisible()
    })

    test('should preserve form data when not switching tabs', async ({ page }) => {
      await page.goto('/auth')

      const testEmail = 'test@example.com'
      await page.locator('#login-email').fill(testEmail)

      // Verify the value is preserved
      await expect(page.locator('#login-email')).toHaveValue(testEmail)
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect to auth page when accessing home without login', async ({
      page,
    }) => {
      // Clear any existing auth
      await clearAuth(page)

      // Try to access home page
      await page.goto('/')

      // Should be redirected to auth page
      await expect(page).toHaveURL('/auth', { timeout: 10000 })
    })

    test('should redirect to auth page when accessing history without login', async ({
      page,
    }) => {
      // Clear any existing auth
      await clearAuth(page)

      // Try to access history page
      await page.goto('/history')

      // Should be redirected to auth page
      await expect(page).toHaveURL('/auth', { timeout: 10000 })
    })
  })
})
