'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

<<<<<<< HEAD
// Checks if the current user is a member of the scholium.
=======
/**
 * Hook to check if current user is still a member of the scholium
 * Redirects to /scholiums if user is kicked or scholium is deleted
 */
>>>>>>> 767a57c23f3d2591e813360076be537055b87a8b
export function useMemberCheck(scholiumId: number | null, userId: string) {
  const router = useRouter()
  const hasRedirectedRef = useRef(false)

  useEffect(() => {
    if (!scholiumId || !userId) return

    const supabase = createClient()

    const redirect = () => {
      if (hasRedirectedRef.current) return
      hasRedirectedRef.current = true
      router.push('/scholiums')
      setTimeout(() => router.refresh(), 100)
    }

<<<<<<< HEAD
    // Check membership
=======
    // Check membership status
>>>>>>> 767a57c23f3d2591e813360076be537055b87a8b
    const checkMembership = async () => {
      const { data } = await supabase
        .from('scholium_members')
        .select('id')
        .eq('scholium_id', scholiumId)
        .eq('user_id', userId)
        .maybeSingle()

      return !!data
    }
<<<<<<< HEAD
=======

    // Initial check
>>>>>>> 767a57c23f3d2591e813360076be537055b87a8b
    checkMembership().then(isMember => {
      if (!isMember) redirect()
    })

<<<<<<< HEAD
    // listen to all changes in scholium_members
=======
    // Subscribe to realtime changes - listen to ALL changes in scholium_members
>>>>>>> 767a57c23f3d2591e813360076be537055b87a8b
    const channel = supabase
      .channel(`member-check-${scholiumId}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scholium_members',
        },
        async (payload) => {
<<<<<<< HEAD
=======
          // On any member change, verify current user is still a member
          // This catches DELETE, UPDATE, and INSERT events
>>>>>>> 767a57c23f3d2591e813360076be537055b87a8b
          if (payload.eventType === 'DELETE' || payload.eventType === 'UPDATE') {
            const isMember = await checkMembership()
            if (!isMember) {
              redirect()
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'scholiums',
          filter: `id=eq.${scholiumId}`,
        },
        () => {
          redirect()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [scholiumId, userId, router])
}
