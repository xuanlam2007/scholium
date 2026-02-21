// Supabase Realtime
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type RealtimeChangeType = 'homework' | 'subject' | 'member' | 'permissions' | 'timeslots' | 'completion'

/**
 * Subscribe to real-time changes for a specific scholium
 * @param scholiumId - scholium ID 
 * @param onChange - Call function
 * @returns Unsubscribe function to clean up
 */

export function subscribeToScholiumChanges(
  scholiumId: number,
  onChange: (changeType: RealtimeChangeType) => void
): () => void {
  const supabase = createClient()

  const channels: RealtimeChannel[] = []

  // Subscribe to homework
  const homeworkChannel = supabase
    .channel(`scholium_${scholiumId}_homework`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'homework',
        filter: `scholium_id=eq.${scholiumId}`,
      },
      () => {
        onChange('homework')
      }
    )
    .subscribe()

  channels.push(homeworkChannel)

  // Subscribe to homework completion
  const completionChannel = supabase
    .channel(`scholium_${scholiumId}_completion`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'homework_completion',
      },
      () => {
        onChange('completion')
      }
    )
    .subscribe()

  channels.push(completionChannel)

  // Subscribe to subject (global)
  const subjectChannel = supabase
    .channel(`scholium_${scholiumId}_subjects`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'subjects',
      },
      () => {
        onChange('subject')
      }
    )
    .subscribe()

  channels.push(subjectChannel)

  // Subscribe to scholium member changes
  const memberChannel = supabase
    .channel(`scholium_${scholiumId}_members`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scholium_members',
        filter: `scholium_id=eq.${scholiumId}`,
      },
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          onChange('permissions')
        } else {
          onChange('member')
        }
      }
    )
    .subscribe()

  channels.push(memberChannel)

  // Subscribe to scholium settings
  const scholiumChannel = supabase
    .channel(`scholium_${scholiumId}_settings`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scholiums',
        filter: `id=eq.${scholiumId}`,
      },
      () => {
        onChange('timeslots')
      }
    )
    .subscribe()

  channels.push(scholiumChannel)

  // Subscribe to attachment
  const attachmentChannel = supabase
    .channel(`scholium_${scholiumId}_attachments`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'attachments',
      },
      () => {
        onChange('homework')
      }
    )
    .subscribe()

  channels.push(attachmentChannel)

  // Cleanup
  return () => {
    channels.forEach((channel) => {
      supabase.removeChannel(channel)
    })
  }
}

export async function broadcastChange(scholiumId: number, type: RealtimeChangeType): Promise<void> {
<<<<<<< HEAD
  // ko co gi de lam o day, supabase tu dong phat hien thay doi va gui den client
=======
  // With Supabase Realtime, database changes automatically trigger subscriptions
  // This function is now a no-op but kept for compatibility
>>>>>>> 767a57c23f3d2591e813360076be537055b87a8b
}
