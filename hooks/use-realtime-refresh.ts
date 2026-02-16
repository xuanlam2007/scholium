'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/** 
 * Hook that listens to SSE events and refreshes only when changes occur
 * This provides instant updates across all users without constant polling
 * Thanks to ChatGPT suggestion for a more efficient approach than polling every few seconds haha
 */
export function useRealtimeRefresh(scholiumId: number) {
  const router = useRouter()
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Connect to SSE endpoint
    const eventSource = new EventSource(`/api/realtime/events?scholiumId=${scholiumId}`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('SSE connection established')
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'connected') {
          return
        }
        console.log('Received change event:', data.type)
        router.refresh()
      } catch (error) {
        console.error('Error parsing SSE message:', error)
      }
    }
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
    }
    // Cleanup
    return () => {
      console.log('Closing SSE connection')
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [scholiumId, router])
}
