import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuthStore } from '@/stores/auth-store'
import { server } from '@/lib/api/mock-server'
import { http, HttpResponse } from 'msw'

describe('useAuthStore', () => {
  // Setup MSW server
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
  afterEach(() => {
    server.resetHandlers()
    // Clear store state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
    // Clear localStorage
    localStorage.clear()
  })
  afterAll(() => server.close())

  describe('login', () => {
    it('should login successfully', async () => {
      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.user).toBeDefined()
        expect(result.current.user?.email).toBe('test@example.com')
        expect(result.current.token).toBeDefined()
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeNull()
      })
    })

    it('should handle login error', async () => {
      server.use(
        http.post('http://localhost:8080/api/v1/users/login', () => {
          return new HttpResponse(
            JSON.stringify({ message: 'Invalid credentials' }),
            { status: 401 }
          )
        })
      )

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        try {
          await result.current.login({
            email: 'wrong@example.com',
            password: 'wrongpassword',
          })
        } catch (error) {
          // Expected error
        }
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.user).toBeNull()
        expect(result.current.error).toBe('Invalid credentials')
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should handle network error', async () => {
      server.use(
        http.post('http://localhost:8080/api/v1/users/login', () => {
          return HttpResponse.error()
        })
      )

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        try {
          await result.current.login({
            email: 'test@example.com',
            password: 'password123',
          })
        } catch (error) {
          // Expected error
        }
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.error).toBe('Unable to connect to server')
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('register', () => {
    it('should register and auto-login successfully', async () => {
      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.register({
          email: 'new@example.com',
          password: 'password123',
          name: 'New User',
        })
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.user).toBeDefined()
        expect(result.current.token).toBeDefined()
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeNull()
      })
    })

    it('should handle registration error', async () => {
      server.use(
        http.post('http://localhost:8080/api/v1/users/register', () => {
          return new HttpResponse(
            JSON.stringify({ message: 'Email already exists' }),
            { status: 400 }
          )
        })
      )

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        try {
          await result.current.register({
            email: 'existing@example.com',
            password: 'password123',
            name: 'Existing User',
          })
        } catch (error) {
          // Expected error
        }
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.error).toBe('Email already exists')
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('logout', () => {
    it('should logout and clear state', async () => {
      const { result } = renderHook(() => useAuthStore())

      // First login
      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      // Then logout
      act(() => {
        result.current.logout()
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
      expect(result.current.token).toBeNull()
      expect(result.current.error).toBeNull()
      expect(localStorage.getItem('auth_token')).toBeNull()
    })
  })

  describe('clearError', () => {
    it('should clear error state', async () => {
      server.use(
        http.post('http://localhost:8080/api/v1/users/login', () => {
          return new HttpResponse(null, { status: 401 })
        })
      )

      const { result } = renderHook(() => useAuthStore())

      // Generate an error
      await act(async () => {
        try {
          await result.current.login({
            email: 'test@example.com',
            password: 'wrong',
          })
        } catch (error) {
          // Expected error
        }
      })

      await waitFor(() => {
        expect(result.current.error).toBeDefined()
      })

      // Clear error
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('persistence', () => {
    it('should persist auth state', async () => {
      const { result, unmount } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      const user = result.current.user
      const token = result.current.token

      // Unmount and remount to simulate page refresh
      unmount()

      const { result: newResult } = renderHook(() => useAuthStore())

      // State should be restored from localStorage
      expect(newResult.current.isAuthenticated).toBe(true)
      expect(newResult.current.user).toEqual(user)
      expect(newResult.current.token).toEqual(token)
    })
  })
})
