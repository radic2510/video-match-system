import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import AuthPage from '@/app/auth/page'
import { useAuthStore } from '@/stores/auth-store'
import { useRouter } from 'next/navigation'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock auth store
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}))

describe('AuthPage', () => {
  const mockPush = vi.fn()
  const mockLogin = vi.fn()
  const mockRegister = vi.fn()
  const mockClearError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({ push: mockPush })
    ;(useAuthStore as any).mockReturnValue({
      login: mockLogin,
      register: mockRegister,
      clearError: mockClearError,
      isLoading: false,
      error: null,
    })
  })

  describe('Tab Switching', () => {
    it('should render with Login tab selected by default', () => {
      render(<AuthPage />)

      expect(screen.getByRole('tab', { name: /login/i, selected: true })).toBeInTheDocument()
    })

    it('should switch to Register tab when clicked', async () => {
      const user = userEvent.setup()
      render(<AuthPage />)

      const registerTab = screen.getByRole('tab', { name: /register/i })
      await user.click(registerTab)

      expect(screen.getByRole('tab', { name: /register/i, selected: true })).toBeInTheDocument()
    })

    it('should show Register form fields when Register tab is selected', async () => {
      const user = userEvent.setup()
      render(<AuthPage />)

      const registerTab = screen.getByRole('tab', { name: /register/i })
      await user.click(registerTab)

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should validate email format on login', async () => {
      const user = userEvent.setup()
      render(<AuthPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
      })
      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('should validate password length on login', async () => {
      const user = userEvent.setup()
      render(<AuthPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, '123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
      })
      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('should validate email format on register', async () => {
      const user = userEvent.setup()
      render(<AuthPage />)

      const registerTab = screen.getByRole('tab', { name: /register/i })
      await user.click(registerTab)

      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
      })
      expect(mockRegister).not.toHaveBeenCalled()
    })
  })

  describe('Successful Login Flow', () => {
    it('should call login with correct credentials', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValueOnce(undefined)

      render(<AuthPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123',
        })
      })
    })

    it('should redirect to home page after successful login', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValueOnce(undefined)

      render(<AuthPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })

    it('should clear form after successful login', async () => {
      const user = userEvent.setup()
      mockLogin.mockResolvedValueOnce(undefined)

      render(<AuthPage />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(emailInput.value).toBe('')
        expect(passwordInput.value).toBe('')
      })
    })
  })

  describe('Successful Registration Flow', () => {
    it('should call register with correct data', async () => {
      const user = userEvent.setup()
      mockRegister.mockResolvedValueOnce(undefined)

      render(<AuthPage />)

      const registerTab = screen.getByRole('tab', { name: /register/i })
      await user.click(registerTab)

      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
        })
      })
    })

    it('should redirect to home page after successful registration', async () => {
      const user = userEvent.setup()
      mockRegister.mockResolvedValueOnce(undefined)

      render(<AuthPage />)

      const registerTab = screen.getByRole('tab', { name: /register/i })
      await user.click(registerTab)

      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })
  })

  describe('Error Display', () => {
    it('should display error message from store', () => {
      ;(useAuthStore as any).mockReturnValue({
        login: mockLogin,
        register: mockRegister,
        clearError: mockClearError,
        isLoading: false,
        error: 'Invalid credentials',
      })

      render(<AuthPage />)

      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })

    it('should display login error when login fails', async () => {
      const user = userEvent.setup()
      mockLogin.mockRejectedValueOnce(new Error('Login failed'))

      render(<AuthPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Error is handled by the store
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })
    })

    it('should display registration error when registration fails', async () => {
      const user = userEvent.setup()
      mockRegister.mockRejectedValueOnce(new Error('Registration failed'))

      render(<AuthPage />)

      const registerTab = screen.getByRole('tab', { name: /register/i })
      await user.click(registerTab)

      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Error is handled by the store
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled()
      })
    })
  })

  describe('Loading States', () => {
    it('should disable form inputs when loading', () => {
      ;(useAuthStore as any).mockReturnValue({
        login: mockLogin,
        register: mockRegister,
        clearError: mockClearError,
        isLoading: true,
        error: null,
      })

      render(<AuthPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /signing in/i })

      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })

    it('should show loading text on submit button', () => {
      ;(useAuthStore as any).mockReturnValue({
        login: mockLogin,
        register: mockRegister,
        clearError: mockClearError,
        isLoading: true,
        error: null,
      })

      render(<AuthPage />)

      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
    })

    it('should show loading text on register button when loading', async () => {
      const user = userEvent.setup()
      ;(useAuthStore as any).mockReturnValue({
        login: mockLogin,
        register: mockRegister,
        clearError: mockClearError,
        isLoading: true,
        error: null,
      })

      render(<AuthPage />)

      const registerTab = screen.getByRole('tab', { name: /register/i })
      await user.click(registerTab)

      expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument()
    })
  })
})
