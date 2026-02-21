'use server'

import { createClient } from '@/lib/supabase/server'
import type { Scholium, ScholiumMember } from '@/lib/scholium'
import { generateAccessId, encryptAccessId, decryptAccessId } from '@/lib/scholium'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

/**
 * Create a new scholium
 */
export async function createScholium(name: string): Promise<{ success: boolean; data?: Scholium; error?: string }> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()
    const accessId = generateAccessId()
    const encryptedId = encryptAccessId(accessId)

    const { data: scholium, error } = await supabase
      .from('scholiums')
      .insert({
        user_id: user.id,
        name,
        encrypted_access_id: encryptedId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating scholium:', error)
      return { success: false, error: 'Failed to create scholium' }
    }

    // Add creator as host member with full permissions
    const { error: memberError } = await supabase
      .from('scholium_members')
      .insert({
        scholium_id: scholium.id,
        user_id: user.id,
        is_host: true,
        can_add_homework: true,
        can_create_subject: true,
      })

    if (memberError) {
      console.error('Error adding host member:', memberError)
      return { success: false, error: 'Failed to add host member' }
    }

    // Set as current scholium
    const cookieStore = await cookies()
    cookieStore.set('current_scholium_id', scholium.id.toString(), {
      maxAge: 7 * 24 * 60 * 60,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    })

    return { success: true, data: scholium as Scholium }
  } catch (error) {
    console.error('Error creating scholium:', error)
    return { success: false, error: 'Failed to create scholium' }
  }
}

/**
 * Join an existing scholium using access ID
 */
export async function joinScholium(accessId: string): Promise<{ success: boolean; data?: Scholium; error?: string }> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()

    // Get all scholiums and decrypt access IDs to find match
    const { data: allScholiums, error } = await supabase
      .from('scholiums')
      .select('*')

    if (error) {
      console.error('Error fetching scholiums:', error)
      return { success: false, error: 'Failed to fetch scholiums' }
    }

    let scholium: Scholium | null = null
    for (const s of allScholiums || []) {
      try {
        const decryptedId = decryptAccessId(s.encrypted_access_id)
        if (decryptedId === accessId.trim()) {
          scholium = s as Scholium
          break
        }
      } catch (e) {
        // Skip invalid encrypted IDs
        continue
      }
    }

    if (!scholium) {
      return { success: false, error: 'Invalid access ID' }
    }

    // Check if user is already a member
    const { data: existing } = await supabase
      .from('scholium_members')
      .select('id')
      .eq('scholium_id', scholium.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      // Set as current scholium
      const cookieStore = await cookies()
      cookieStore.set('current_scholium_id', scholium.id.toString(), {
        maxAge: 7 * 24 * 60 * 60,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      })

      return { success: true, data: scholium }
    }

    // Add user as member with default permissions
    const { error: memberError } = await supabase
      .from('scholium_members')
      .insert({
        scholium_id: scholium.id,
        user_id: user.id,
        is_host: false,
        can_add_homework: false,
        can_create_subject: false,
      })

    if (memberError) {
      console.error('Error adding member:', memberError)
      return { success: false, error: 'Failed to join scholium' }
    }

    // Set as current scholium
    const cookieStore = await cookies()
    cookieStore.set('current_scholium_id', scholium.id.toString(), {
      maxAge: 7 * 24 * 60 * 60,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    })

    return { success: true, data: scholium }
  } catch (error) {
    console.error('Error joining scholium:', error)
    return { success: false, error: 'Failed to join scholium' }
  }
}

/**
 * Get user's scholiums
 */
export async function getUserScholiums(): Promise<Scholium[]> {
  try {
    const user = await getSession()
    if (!user) return []

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('scholium_members')
      .select(`
        scholium_id,
        scholiums (
          id,
          user_id,
          name,
          encrypted_access_id,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching scholiums:', error)
      return []
    }

    // Extract scholiums from the join result and sort by updated_at
    const scholiums = data
      .map((item: any) => item.scholiums)
      .filter((s: any) => s !== null)
      .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    return scholiums as Scholium[]
  } catch (error) {
    console.error('Error fetching scholiums:', error)
    return []
  }
}

/**
 * Get scholium members
 */
export async function getScholiumMembers(scholiumId: number): Promise<(ScholiumMember & { user_name: string; user_email: string })[]> {
  try {
    const user = await getSession()
    if (!user) return []

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('scholium_members')
      .select(`
        id,
        scholium_id,
        user_id,
        is_host,
        is_cohost,
        can_add_homework,
        can_create_subject,
        joined_at,
        users (
          name,
          email
        )
      `)
      .eq('scholium_id', scholiumId)
      .order('is_host', { ascending: false })
      .order('is_cohost', { ascending: false })
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Error fetching members:', error)
      return []
    }

    // Transform the data to match expected format
    return data.map((member: any) => ({
      id: member.id,
      scholium_id: member.scholium_id,
      user_id: member.user_id,
      is_host: member.is_host,
      is_cohost: member.is_cohost || false,
      can_add_homework: member.can_add_homework,
      can_create_subject: member.can_create_subject,
      joined_at: member.joined_at,
      user_name: member.users?.name || 'Unknown',
      user_email: member.users?.email || '',
    }))
  } catch (error) {
    console.error('Error fetching members:', error)
    return []
  }
}

/**
 * Renew scholium access ID (only host can do this)
 */
export async function renewScholiumAccessId(scholiumId: number): Promise<{ success: boolean; newAccessId?: string; error?: string }> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()

    // Check if user is host
    const { data: hostCheck } = await supabase
      .from('scholium_members')
      .select('id')
      .eq('scholium_id', scholiumId)
      .eq('user_id', user.id)
      .eq('is_host', true)
      .single()

    if (!hostCheck) {
      return { success: false, error: 'Only hosts can renew access ID' }
    }

    const newAccessId = generateAccessId()
    const encryptedId = encryptAccessId(newAccessId)

    const { error } = await supabase
      .from('scholiums')
      .update({
        encrypted_access_id: encryptedId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scholiumId)

    if (error) {
      console.error('Error renewing access ID:', error)
      return { success: false, error: 'Failed to renew access ID' }
    }

    return { success: true, newAccessId }
  } catch (error) {
    console.error('Error renewing access ID:', error)
    return { success: false, error: 'Failed to renew access ID' }
  }
}

/**
 * Get current scholium ID from cookie
 */
export async function getCurrentScholiumId(): Promise<number | null> {
  try {
    const cookieStore = await cookies()
    const id = cookieStore.get('current_scholium_id')?.value
    return id ? parseInt(id) : null
  } catch (error) {
    return null
  }
}

/**
 * Set current scholium
 */
export async function setCurrentScholium(scholiumId: number): Promise<void> {
  try {
    const user = await getSession()
    if (!user) return

    const supabase = await createClient()

    // Verify user is a member
    const { data: member } = await supabase
      .from('scholium_members')
      .select('id')
      .eq('scholium_id', scholiumId)
      .eq('user_id', user.id)
      .single()

    if (!member) return

    const cookieStore = await cookies()
    cookieStore.set('current_scholium_id', scholiumId.toString(), {
      maxAge: 7 * 24 * 60 * 60,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    })
  } catch (error) {
    console.error('Error setting current scholium:', error)
  }
}

/**
 * Get scholium details with decrypted access ID and member info
 */
export async function getScholiumDetails(scholiumId: number): Promise<{ 
  success: boolean
  data?: {
    id: number
    name: string
    accessId: string
    isHost: boolean
    memberCount: number
  }
  error?: string
}> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()

    // Get scholium data
    const { data: scholium, error } = await supabase
      .from('scholiums')
      .select('id, name, encrypted_access_id')
      .eq('id', scholiumId)
      .single()

    if (error || !scholium) {
      return { success: false, error: 'Scholium not found' }
    }

    // Verify user is a member
    const { data: member } = await supabase
      .from('scholium_members')
      .select('is_host')
      .eq('scholium_id', scholiumId)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return { success: false, error: 'Not a member of this scholium' }
    }

    const accessId = decryptAccessId(scholium.encrypted_access_id)

    // Get member count
    const { count } = await supabase
      .from('scholium_members')
      .select('*', { count: 'exact', head: true })
      .eq('scholium_id', scholiumId)

    return {
      success: true,
      data: {
        id: scholium.id,
        name: scholium.name,
        accessId,
        isHost: member.is_host || false,
        memberCount: count || 0,
      },
    }
  } catch (error) {
    console.error('Error fetching scholium details:', error)
    return { success: false, error: 'Failed to fetch scholium' }
  }
}

/**
 * Update member permissions
 */
export async function updateMemberPermissions(
  scholiumId: number,
  memberId: number,
  canAddHomework: boolean,
  canCreateSubject: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()

    // Check if user is host
    const { data: hostCheck } = await supabase
      .from('scholium_members')
      .select('id')
      .eq('scholium_id', scholiumId)
      .eq('user_id', user.id)
      .eq('is_host', true)
      .single()

    if (!hostCheck) {
      return { success: false, error: 'Only hosts can manage member permissions' }
    }

    const { error } = await supabase
      .from('scholium_members')
      .update({
        can_add_homework: canAddHomework,
        can_create_subject: canCreateSubject,
      })
      .eq('id', memberId)

    if (error) {
      console.error('Error updating permissions:', error)
      return { success: false, error: 'Failed to update permissions' }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error updating member permissions:', error)
    return { success: false, error: 'Failed to update permissions' }
  }
}

/**
 * Remove a member from scholium (host only)
 */
export async function removeScholiumMemberAsHost(memberId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()

    // Get the member's scholium_id first
    const { data: member, error: memberError } = await supabase
      .from('scholium_members')
      .select('scholium_id, is_host')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      return { success: false, error: 'Member not found' }
    }

    // Prevent removing hosts
    if (member.is_host) {
      return { success: false, error: 'Cannot remove host member' }
    }

    // Check if current user is host of this scholium
    const { data: hostCheck } = await supabase
      .from('scholium_members')
      .select('id')
      .eq('scholium_id', member.scholium_id)
      .eq('user_id', user.id)
      .eq('is_host', true)
      .single()

    if (!hostCheck) {
      return { success: false, error: 'Only hosts can remove members' }
    }

    // Remove the member
    const { error: deleteError } = await supabase
      .from('scholium_members')
      .delete()
      .eq('id', memberId)

    if (deleteError) {
      console.error('Error removing member:', deleteError)
      return { success: false, error: 'Failed to remove member' }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error removing member:', error)
    return { success: false, error: 'Failed to remove member' }
  }
}

/**
 * Update member permissions (host only)
 */
export async function updateMemberPermissionsAsHost(
  memberId: number,
  permissions: { can_add_homework: boolean; can_create_subject: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getSession()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Get the member to check scholium_id and is_host status
    const { data: member, error: memberError } = await supabase
      .from('scholium_members')
      .select('scholium_id, is_host')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      return { success: false, error: 'Member not found' }
    }

    // Check if user is a host of this scholium
    const { data: hostCheck } = await supabase
      .from('scholium_members')
      .select('is_host')
      .eq('scholium_id', member.scholium_id)
      .eq('user_id', user.id)
      .single()

    if (!hostCheck?.is_host) {
      return { success: false, error: 'Only hosts can update permissions' }
    }

    // Don't allow changing host permissions
    if (member.is_host) {
      return { success: false, error: 'Cannot modify host permissions' }
    }

    const { error } = await supabase
      .from('scholium_members')
      .update({
        can_add_homework: permissions.can_add_homework,
        can_create_subject: permissions.can_create_subject,
      })
      .eq('id', memberId)

    if (error) {
      console.error('Error updating permissions:', error)
      return { success: false, error: 'Failed to update permissions' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('Error updating permissions:', error)
    return { success: false, error: 'Failed to update permissions' }
  }
}

/**
 * Update time slots configuration
 */
export async function updateTimeSlots(
  scholiumId: number,
  slots: Array<{ start: string; end: string }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()

    // Check if user is host
    const { data: hostCheck } = await supabase
      .from('scholium_members')
      .select('id')
      .eq('scholium_id', scholiumId)
      .eq('user_id', user.id)
      .eq('is_host', true)
      .single()

    if (!hostCheck) {
      return { success: false, error: 'Only hosts can edit time slots' }
    }

    // Validate slot count
    if (slots.length < 4 || slots.length > 10) {
      return { success: false, error: 'Time slots must be between 4 and 10' }
    }

    const { error } = await supabase
      .from('scholiums')
      .update({ time_slots: slots })
      .eq('id', scholiumId)

    if (error) {
      console.error('Error updating time slots:', error)
      return { success: false, error: 'Failed to update time slots' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating time slots:', error)
    return { success: false, error: 'Failed to update time slots' }
  }
}

/**
 * Get time slots for a scholium
 */
export async function getTimeSlots(
  scholiumId: number
): Promise<Array<{ start: string; end: string }>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('scholiums')
      .select('time_slots')
      .eq('id', scholiumId)
      .single()

    if (error || !data) {
      // Return default 6 slots
      return [
        { start: '07:00', end: '08:30' },
        { start: '08:45', end: '10:15' },
        { start: '10:30', end: '12:00' },
        { start: '13:00', end: '14:30' },
        { start: '14:45', end: '16:15' },
        { start: '16:30', end: '18:00' },
      ]
    }

    const slots = data.time_slots
    if (!slots || !Array.isArray(slots)) {
      // Return default 6 slots
      return [
        { start: '07:00', end: '08:30' },
        { start: '08:45', end: '10:15' },
        { start: '10:30', end: '12:00' },
        { start: '13:00', end: '14:30' },
        { start: '14:45', end: '16:15' },
        { start: '16:30', end: '18:00' },
      ]
    }

    return slots
  } catch (error) {
    console.error('Error fetching time slots:', error)
    // Return default 6 slots on error
    return [
      { start: '07:00', end: '08:30' },
      { start: '08:45', end: '10:15' },
      { start: '10:30', end: '12:00' },
      { start: '13:00', end: '14:30' },
      { start: '14:45', end: '16:15' },
      { start: '16:30', end: '18:00' },
    ]
  }
}

/**
 * Delete a scholium (host only)
 */
export async function deleteScholium(scholiumId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()

    // Check if user is the host
    const { data: hostCheck } = await supabase
      .from('scholium_members')
      .select('id')
      .eq('scholium_id', scholiumId)
      .eq('user_id', user.id)
      .eq('is_host', true)
      .single()

    if (!hostCheck) {
      return { success: false, error: 'Only the host can delete the scholium' }
    }

    // Delete the scholium (CASCADE will delete all members, homework, etc.)
    const { error } = await supabase
      .from('scholiums')
      .delete()
      .eq('id', scholiumId)

    if (error) {
      console.error('Error deleting scholium:', error)
      return { success: false, error: 'Failed to delete scholium' }
    }

    // Clear current scholium cookie if it's the one being deleted
    const cookieStore = await cookies()
    const currentId = cookieStore.get('current_scholium_id')?.value
    if (currentId && parseInt(currentId) === scholiumId) {
      cookieStore.delete('current_scholium_id')
    }

    revalidatePath('/scholiums')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error deleting scholium:', error)
    return { success: false, error: 'Failed to delete scholium' }
  }
}

/**
 * Quit a scholium (member only, not host)
 */
export async function quitScholium(scholiumId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()

    // Get member info
    const { data: member } = await supabase
      .from('scholium_members')
      .select('id, is_host')
      .eq('scholium_id', scholiumId)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return { success: false, error: 'Not a member of this scholium' }
    }

    if (member.is_host) {
      return { success: false, error: 'Hosts cannot quit. Transfer host role first or delete the scholium.' }
    }

    // Remove member
    const { error } = await supabase
      .from('scholium_members')
      .delete()
      .eq('id', member.id)

    if (error) {
      console.error('Error quitting scholium:', error)
      return { success: false, error: 'Failed to quit scholium' }
    }

    // Clear current scholium cookie if it's the one being quit
    const cookieStore = await cookies()
    const currentId = cookieStore.get('current_scholium_id')?.value
    if (currentId && parseInt(currentId) === scholiumId) {
      cookieStore.delete('current_scholium_id')
    }

    revalidatePath('/scholiums')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error quitting scholium:', error)
    return { success: false, error: 'Failed to quit scholium' }
  }
}

/**
 * Transfer host role to another member (current host only)
 */
export async function transferHost(scholiumId: number, newHostUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()

    // Check if current user is the host
    const { data: currentHost } = await supabase
      .from('scholium_members')
      .select('id')
      .eq('scholium_id', scholiumId)
      .eq('user_id', user.id)
      .eq('is_host', true)
      .single()

    if (!currentHost) {
      return { success: false, error: 'Only the host can transfer their role' }
    }

    // Check if new host is a member
    const { data: newHost } = await supabase
      .from('scholium_members')
      .select('id')
      .eq('scholium_id', scholiumId)
      .eq('user_id', newHostUserId)
      .single()

    if (!newHost) {
      return { success: false, error: 'New host must be a member of the scholium' }
    }

    // Transfer host role (make old host a regular member, new member the host)
    const { error: demoteError } = await supabase
      .from('scholium_members')
      .update({ is_host: false, is_cohost: false })
      .eq('id', currentHost.id)

    if (demoteError) {
      console.error('Error demoting current host:', demoteError)
      return { success: false, error: 'Failed to transfer host role' }
    }

    const { error: promoteError } = await supabase
      .from('scholium_members')
      .update({ 
        is_host: true, 
        is_cohost: false,
        can_add_homework: true,
        can_create_subject: true
      })
      .eq('id', newHost.id)

    if (promoteError) {
      console.error('Error promoting new host:', promoteError)
      return { success: false, error: 'Failed to transfer host role' }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error transferring host:', error)
    return { success: false, error: 'Failed to transfer host role' }
  }
}

/**
 * Toggle co-host status for a member (host only)
 */
export async function toggleCohost(memberId: number, isCohost: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()

    // Get member info
    const { data: member } = await supabase
      .from('scholium_members')
      .select('scholium_id, is_host')
      .eq('id', memberId)
      .single()

    if (!member) {
      return { success: false, error: 'Member not found' }
    }

    // Can't make host a co-host
    if (member.is_host) {
      return { success: false, error: 'Cannot change host status' }
    }

    // Check if current user is host
    const { data: hostCheck } = await supabase
      .from('scholium_members')
      .select('id, is_cohost')
      .eq('scholium_id', member.scholium_id)
      .eq('user_id', user.id)
      .single()

    if (!hostCheck || (!hostCheck.is_cohost && !await isUserHost(supabase, member.scholium_id, user.id))) {
      return { success: false, error: 'Only hosts can manage co-hosts' }
    }

    // Update co-host status and grant all permissions if making co-host
    const { error } = await supabase
      .from('scholium_members')
      .update({ 
        is_cohost: isCohost,
        can_add_homework: isCohost ? true : undefined,
        can_create_subject: isCohost ? true : undefined
      })
      .eq('id', memberId)

    if (error) {
      console.error('Error toggling co-host:', error)
      return { success: false, error: 'Failed to update co-host status' }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error toggling co-host:', error)
    return { success: false, error: 'Failed to update co-host status' }
  }
}

// Helper function to check if user is host
async function isUserHost(supabase: any, scholiumId: number, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('scholium_members')
    .select('is_host')
    .eq('scholium_id', scholiumId)
    .eq('user_id', userId)
    .eq('is_host', true)
    .single()

  return !!data
}
