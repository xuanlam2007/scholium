'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useRealtimeRefresh(intervalMs: number = 3000) {
  const router = useRouter()

  useEffect(() => {
    router.refresh()

    const interval = setInterval(() => {
      router.refresh()
    }, intervalMs)

    // Pause when tab is hidden to save resources
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(interval)
      } else {
        router.refresh()
        // Restart interval when tab becomes visible
        const newInterval = setInterval(() => {
          router.refresh()
        }, intervalMs)
        return () => clearInterval(newInterval)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [router, intervalMs])
}
