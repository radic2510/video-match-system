import { renderHook, act } from '@testing-library/react'
import { usePolling } from '@/lib/hooks/use-polling'

// Mock timers
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('usePolling', () => {
  it('should call fetch function immediately', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ status: 'COMPLETED' })
    const shouldStopFn = vi.fn().mockReturnValue(true) // Stop immediately

    renderHook(() => usePolling(fetchFn, shouldStopFn))

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('should stop polling when shouldStop returns true', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ status: 'PROCESSING' })
      .mockResolvedValueOnce({ status: 'COMPLETED' })

    const shouldStopFn = vi.fn()
      .mockReturnValueOnce(false) // First call - continue
      .mockReturnValueOnce(true)  // Second call - stop

    renderHook(() => usePolling(fetchFn, shouldStopFn, { enabled: true }))

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // Should call twice: initial + one retry before stopping
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(shouldStopFn).toHaveBeenCalledTimes(2)
  })

  it('should timeout after max duration', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ status: 'PROCESSING' })
    const shouldStopFn = vi.fn().mockReturnValue(false)
    const onTimeout = vi.fn()

    const { result } = renderHook(() => usePolling(fetchFn, shouldStopFn, {
      enabled: true,
      onTimeout,
      maxDuration: 5000, // 5 seconds for faster testing
    }))

    // Wait for initial setup
    await act(async () => {
      await Promise.resolve()
    })

    // Advance time past max duration
    await act(async () => {
      vi.advanceTimersByTime(6000)
    })

    expect(onTimeout).toHaveBeenCalled()
    expect(result.current.isPolling).toBe(false)
  })

  it('should call onError when fetch fails', async () => {
    const error = new Error('Network error')
    const fetchFn = vi.fn().mockRejectedValue(error)
    const shouldStopFn = vi.fn().mockReturnValue(false)
    const onError = vi.fn()

    renderHook(() => usePolling(fetchFn, shouldStopFn, {
      enabled: true,
      onError
    }))

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(onError).toHaveBeenCalledWith(error)
  })

  it('should not poll when enabled is false', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ status: 'PROCESSING' })
    const shouldStopFn = vi.fn().mockReturnValue(false)

    renderHook(() => usePolling(fetchFn, shouldStopFn, { enabled: false }))

    await act(async () => {
      vi.advanceTimersByTime(10000)
    })

    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('should cleanup on unmount', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ status: 'PROCESSING' })
    const shouldStopFn = vi.fn().mockReturnValue(false)

    const { unmount } = renderHook(() => usePolling(fetchFn, shouldStopFn, { enabled: true }))

    await act(async () => {
      await Promise.resolve() // Let first call happen
    })

    const callsBeforeUnmount = fetchFn.mock.calls.length

    // Unmount
    unmount()

    // Advance timers - should not call again after unmount
    await act(async () => {
      vi.advanceTimersByTime(10000)
      await vi.runAllTimersAsync()
    })

    expect(fetchFn).toHaveBeenCalledTimes(callsBeforeUnmount)
  })

  it('should return isPolling status', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ status: 'COMPLETED' })
    const shouldStopFn = vi.fn().mockReturnValue(true)

    const { result } = renderHook(() => usePolling(fetchFn, shouldStopFn, { enabled: true }))

    // Initially should be polling
    expect(result.current.isPolling).toBe(true)

    // After completion, should stop polling
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(result.current.isPolling).toBe(false)
  })

  it('should track elapsed time', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ status: 'PROCESSING' })
    const shouldStopFn = vi.fn().mockReturnValue(true)

    const { result } = renderHook(() => usePolling(fetchFn, shouldStopFn, { enabled: true }))

    // Initial elapsed time should be 0
    expect(result.current.elapsedMs).toBe(0)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // After first call, elapsed time should still be tracked
    expect(result.current.elapsedMs).toBeGreaterThanOrEqual(0)
  })
})
