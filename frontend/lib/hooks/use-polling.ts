import { useEffect, useRef, useState, useCallback } from 'react'

export interface PollingOptions {
  enabled?: boolean
  onTimeout?: () => void
  onError?: (error: Error) => void
  maxDuration?: number // Maximum duration in ms (default: 5 minutes)
  initialDelay?: number // Initial delay in ms (default: 3000)
  maxDelay?: number // Maximum delay in ms (default: 10000)
}

/**
 * Custom hook for polling with exponential backoff
 *
 * Polling strategy:
 * - Start at 3s delay
 * - Increase to 5s, then 10s (max)
 * - Timeout after 5 minutes
 * - Stop when shouldStop returns true
 *
 * @param fetchFn Function to call for each poll
 * @param shouldStop Function to determine if polling should stop
 * @param options Polling options
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  shouldStop: (data?: T) => boolean,
  options: PollingOptions = {}
) {
  const {
    enabled = true,
    onTimeout,
    onError,
    maxDuration = 5 * 60 * 1000, // 5 minutes
    initialDelay = 3000, // 3 seconds
    maxDelay = 10000, // 10 seconds
  } = options

  const [isPolling, setIsPolling] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)

  const timeoutRef = useRef<NodeJS.Timeout>()
  const intervalRef = useRef<NodeJS.Timeout>()
  const startTimeRef = useRef<number>(0)
  const currentDelayRef = useRef<number>(initialDelay)
  const isMountedRef = useRef(true)

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = undefined
    }
  }, [])

  const poll = useCallback(async () => {
    if (!isMountedRef.current) return

    try {
      const data = await fetchFn()

      if (!isMountedRef.current) return

      // Check if we should stop
      if (shouldStop(data)) {
        setIsPolling(false)
        clearTimers()
        return
      }

      // Update elapsed time
      const elapsed = Date.now() - startTimeRef.current
      setElapsedMs(elapsed)

      // Schedule next poll with exponential backoff
      const nextDelay = Math.min(
        currentDelayRef.current * 1.67, // Exponential factor to get 3s -> 5s -> 10s
        maxDelay
      )
      currentDelayRef.current = nextDelay

      intervalRef.current = setTimeout(() => {
        poll()
      }, nextDelay)
    } catch (error) {
      if (!isMountedRef.current) return

      if (onError) {
        onError(error as Error)
      }

      setIsPolling(false)
      clearTimers()
    }
  }, [fetchFn, shouldStop, onError, maxDelay, clearTimers])

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      clearTimers()
    }
  }, [clearTimers])

  useEffect(() => {
    if (!enabled) {
      clearTimers()
      setIsPolling(false)
      return
    }

    setIsPolling(true)
    startTimeRef.current = Date.now()
    currentDelayRef.current = initialDelay
    setElapsedMs(0)

    // Start polling immediately
    poll()

    // Set timeout for max duration
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsPolling(false)
        clearTimers()
        if (onTimeout) {
          onTimeout()
        }
      }
    }, maxDuration)

    return () => {
      clearTimers()
    }
  }, [enabled, poll, onTimeout, maxDuration, initialDelay, clearTimers])

  return {
    isPolling,
    elapsedMs,
  }
}
