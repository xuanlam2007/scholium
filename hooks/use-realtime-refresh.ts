'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { subscribeToScholiumChanges } from '@/lib/realtime'

/** 
 * Hook that listens to Supabase Realtime database changes and refreshes the UI
 * This provides instant updates across all users in the same scholium
 * Uses Supabase's native realtime subscriptions - no polling or SSE required
 */
export function useRealtimeRefresh(scholiumId: number) {
  const router = useRouter()

  useEffect(() => {
    if (!scholiumId) return

    console.log('[v0] Setting up realtime subscriptions for scholium', scholiumId)

    // Subscribe to all changes in this scholium
    const unsubscribe = subscribeToScholiumChanges(scholiumId, (changeType) => {
      console.log('[v0] Change detected, refreshing UI:', changeType)
      router.refresh()
    })

    // Cleanup subscriptions when component unmounts or scholiumId changes
    return () => {
      console.log('[v0] Cleaning up realtime subscriptions for scholium', scholiumId)
      unsubscribe()
    }
  }, [scholiumId, router])
}
