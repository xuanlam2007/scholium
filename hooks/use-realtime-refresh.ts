'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeRefresh(scholiumId: number, userId: string) {
  const router = useRouter()

  useEffect(() => {
    if (!scholiumId || !userId) return

    const supabase = createClient()
    let isRedirecting = false

    const checkMembershipAndRedirect = async () => {
      if (isRedirecting) return
      
      const { data } = await supabase
        .from('scholium_members')
        .select('id')
        .eq('scholium_id', scholiumId)
        .eq('user_id', userId)
        .maybeSingle()
      
      if (!data) {
        isRedirecting = true
        window.location.href = '/scholiums'
      }
    }
    checkMembershipAndRedirect()

    const channelName = `scholium-${scholiumId}`
    const channel = supabase.channel(channelName)
      // Listen to homework changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'homework',
          filter: `scholium_id=eq.${scholiumId}`,
        },
        () => router.refresh()
      )
      // Listen to subject changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subjects',
          filter: `scholium_id=eq.${scholiumId}`,
        },
        () => router.refresh()
      )
      // Listen to DELETE events on scholium_members - check if current user was kicked
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'scholium_members',
        },
        async () => {
          await checkMembershipAndRedirect()
          if (!isRedirecting) {
            router.refresh()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scholium_members',
        },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scholium_members',
        },
        () => router.refresh()
      )
      // Listen to homework completion
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'homework_completion',
        },
        () => router.refresh()
      )
      // Listen to scholium deletion
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'scholiums',
          filter: `id=eq.${scholiumId}`,
        },
        () => {
          isRedirecting = true
          window.location.href = '/scholiums'
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
        } else if (status === 'CHANNEL_ERROR') {
          checkMembershipAndRedirect()
        }
      })

    // Cleanup
    return () => {
      channel.unsubscribe()
    }
  }, [scholiumId, userId, router])
}
