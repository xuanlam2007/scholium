'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Checks if the current user is a member of the scholium.
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

    // Check membership
    const checkMembership = async () => {
      const { data } = await supabase
        .from('scholium_members')
        .select('id')
        .eq('scholium_id', scholiumId)
        .eq('user_id', userId)
        .maybeSingle()

      return !!data
    }
    checkMembership().then(isMember => {
      if (!isMember) redirect()
    })

    // listen to all changes in scholium_members
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
