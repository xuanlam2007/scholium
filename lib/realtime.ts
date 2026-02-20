// Supabase Realtime Integration
// This module provides real-time subscription utilities using Supabase's native realtime features
// No polling or SSE required - Supabase handles everything automatically

import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type RealtimeChangeType = 'homework' | 'subject' | 'member' | 'permissions' | 'timeslots' | 'completion'

/**
 * Subscribe to real-time changes for a specific scholium
 * @param scholiumId - The scholium ID to subscribe to
 * @param onChange - Callback function triggered when data changes
 * @returns Unsubscribe function to clean up the subscription
 */
export function subscribeToScholiumChanges(
  scholiumId: number,
  onChange: (changeType: RealtimeChangeType) => void
): () => void {
  const supabase = createClient()

  const channels: RealtimeChannel[] = []

  // Subscribe to homework changes
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

  // Subscribe to homework completion changes
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

  // Subscribe to subject changes (subjects are global, not per-scholium)
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
          // Check if permissions were updated
          onChange('permissions')
        } else {
          onChange('member')
        }
      }
    )
    .subscribe()

  channels.push(memberChannel)

  // Subscribe to scholium settings changes (including time slots)
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

  // Subscribe to attachment changes for all homework in this scholium
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

  // Return cleanup function
  return () => {
    channels.forEach((channel) => {
      supabase.removeChannel(channel)
    })
  }
}

/**
 * Legacy function for backward compatibility
 * No longer needed with Supabase Realtime, but kept to avoid breaking changes
 */
export async function broadcastChange(scholiumId: number, type: RealtimeChangeType): Promise<void> {
  // With Supabase Realtime, database changes automatically trigger subscriptions
  // This function is now a no-op but kept for compatibility
}
