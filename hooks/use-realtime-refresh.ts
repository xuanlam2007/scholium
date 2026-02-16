'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Hook that automatically refreshes the page data at regular intervals
 * for real-time updates across all users
 */
export function useRealtimeRefresh(intervalMs: number = 3000) {
  const router = useRouter()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Function to start the polling interval
    const startPolling = () => {
      // Clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // Refresh immediately
      router.refresh()

      // Start new interval
      intervalRef.current = setInterval(() => {
        router.refresh()
      }, intervalMs)
    }

    // Function to stop polling
    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    // Handle visibility change to pause/resume polling
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        startPolling()
      }
    }

    // Start polling initially
    startPolling()

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [router, intervalMs])
}
