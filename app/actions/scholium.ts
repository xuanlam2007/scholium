'use server'

import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { generateAccessId, encryptAccessId, decryptAccessId, type Scholium, type ScholiumMember } from '@/lib/scholium'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * Create a new scholium
 */
export async function createScholium(name: string): Promise<{ success: boolean; data?: Scholium; error?: string }> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    const accessId = generateAccessId()
    const encryptedId = encryptAccessId(accessId)

    const result = await sql`
      INSERT INTO scholiums (user_id, name, encrypted_access_id)
      VALUES (${user.id}, ${name}, ${encryptedId})
      RETURNING id, user_id, name, encrypted_access_id, created_at, updated_at
    `

    const scholium = result[0] as Scholium

    // Add creator as host member with full permissions
    await sql`
      INSERT INTO scholium_members (scholium_id, user_id, is_host, can_add_homework, can_create_subject)
      VALUES (${scholium.id}, ${user.id}, true, true, true)
    `

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
    console.error('[v0] Error creating scholium:', error)
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

    // Get all scholiums and decrypt access IDs to find match
    const allScholiums = await sql`
      SELECT id, user_id, name, encrypted_access_id, created_at, updated_at
      FROM scholiums
    `

    let scholium: Scholium | null = null
    for (const s of allScholiums) {
      try {
        const decryptedId = decryptAccessId((s as any).encrypted_access_id)
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
    const existing = await sql`
      SELECT id FROM scholium_members
      WHERE scholium_id = ${scholium.id} AND user_id = ${user.id}
    `

    if (existing.length > 0) {
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
    await sql`
      INSERT INTO scholium_members (scholium_id, user_id, is_host, can_add_homework, can_create_subject)
      VALUES (${scholium.id}, ${user.id}, false, false, false)
    `

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
    console.error('[v0] Error joining scholium:', error)
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

    const result = await sql`
      SELECT DISTINCT t.id, t.user_id, t.name, t.encrypted_access_id, t.created_at, t.updated_at
      FROM scholiums t
      INNER JOIN scholium_members tm ON t.id = tm.scholium_id
      WHERE tm.user_id = ${user.id}
      ORDER BY t.updated_at DESC
    `

    return result as Scholium[]
  } catch (error) {
    console.error('[v0] Error fetching scholiums:', error)
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

    const result = await sql`
      SELECT tm.id, tm.scholium_id, tm.user_id, tm.is_host, tm.joined_at, u.name as user_name, u.email as user_email
      FROM scholium_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.scholium_id = ${scholiumId}
      ORDER BY tm.is_host DESC, tm.joined_at ASC
    `

    return result as (ScholiumMember & { user_name: string; user_email: string })[]
  } catch (error) {
    console.error('[v0] Error fetching members:', error)
    return []
  }
}

/**
 * Renew scholium access ID (only admin can do this)
 */
export async function renewScholiumAccessId(scholiumId: number): Promise<{ success: boolean; newAccessId?: string; error?: string }> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Check if user is host
    const hostCheck = await sql`
      SELECT id FROM scholium_members
      WHERE scholium_id = ${scholiumId} AND user_id = ${user.id} AND is_host = true
    `

    if (hostCheck.length === 0) {
      return { success: false, error: 'Only hosts can renew access ID' }
    }

    const newAccessId = generateAccessId()
    const encryptedId = encryptAccessId(newAccessId)

    await sql`
      UPDATE scholiums
      SET encrypted_access_id = ${encryptedId}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${scholiumId}
    `

    return { success: true, newAccessId }
  } catch (error) {
    console.error('[v0] Error renewing access ID:', error)
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

    // Verify user is a member
    const member = await sql`
      SELECT id FROM scholium_members
      WHERE scholium_id = ${scholiumId} AND user_id = ${user.id}
    `

    if (member.length === 0) return

    const cookieStore = await cookies()
    cookieStore.set('current_scholium_id', scholiumId.toString(), {
      maxAge: 7 * 24 * 60 * 60,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    })
  } catch (error) {
    console.error('[v0] Error setting current scholium:', error)
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

    const result = await sql`
      SELECT t.id, t.name, t.encrypted_access_id
      FROM scholiums t
      INNER JOIN scholium_members tm ON t.id = tm.scholium_id
      WHERE t.id = ${scholiumId} AND tm.user_id = ${user.id}
    `

    if (result.length === 0) {
      return { success: false, error: 'Scholium not found' }
    }

    const scholium = result[0] as any
    const accessId = decryptAccessId(scholium.encrypted_access_id)

    const hostCheck = await sql`
      SELECT id FROM scholium_members
      WHERE scholium_id = ${scholiumId} AND user_id = ${user.id} AND is_host = true
    `

    const memberCount = await sql`
      SELECT COUNT(*) as count FROM scholium_members
      WHERE scholium_id = ${scholiumId}
    `

    return {
      success: true,
      data: {
        id: scholium.id,
        name: scholium.name,
        accessId,
        isHost: hostCheck.length > 0,
        memberCount: (memberCount[0] as any).count || 0,
      },
    }
  } catch (error) {
    console.error('[v0] Error fetching scholium details:', error)
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

    // Check if user is host
    const hostCheck = await sql`
      SELECT id FROM scholium_members
      WHERE scholium_id = ${scholiumId} AND user_id = ${user.id} AND is_host = true
    `

    if (hostCheck.length === 0) {
      return { success: false, error: 'Only hosts can manage member permissions' }
    }

    await sql`
      UPDATE scholium_members
      SET can_add_homework = ${canAddHomework}, can_create_subject = ${canCreateSubject}
      WHERE scholium_id = ${scholiumId} AND user_id = ${memberId}
    `

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('[v0] Error updating member permissions:', error)
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

    // Get the member's scholium_id first
    const memberResult = await sql`
      SELECT scholium_id, is_host FROM scholium_members WHERE id = ${memberId}
    `

    if (memberResult.length === 0) {
      return { success: false, error: 'Member not found' }
    }

    const member = memberResult[0] as any
    
    // Prevent removing hosts
    if (member.is_host) {
      return { success: false, error: 'Cannot remove host member' }
    }

    // Check if current user is host of this scholium
    const hostCheck = await sql`
      SELECT id FROM scholium_members 
      WHERE scholium_id = ${member.scholium_id} AND user_id = ${user.id} AND is_host = true
    `

    if (hostCheck.length === 0) {
      return { success: false, error: 'Only hosts can remove members' }
    }

    // Remove the member
    await sql`DELETE FROM scholium_members WHERE id = ${memberId}`

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('[v0] Error removing member:', error)
    return { success: false, error: 'Failed to remove member' }
  }
}

/**
 * Update member permissions (host only)
 */
export async function updateMemberPermissionsAsHost(
  memberId: number,
  permissions: {
    can_add_homework: boolean
    can_create_subject: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Get the member's scholium_id
    const memberResult = await sql`
      SELECT scholium_id, is_host FROM scholium_members WHERE id = ${memberId}
    `

    if (memberResult.length === 0) {
      return { success: false, error: 'Member not found' }
    }

    const member = memberResult[0] as any
    
    // Check if current user is host of this scholium
    const hostCheck = await sql`
      SELECT id FROM scholium_members 
      WHERE scholium_id = ${member.scholium_id} AND user_id = ${user.id} AND is_host = true
    `

    if (hostCheck.length === 0) {
      return { success: false, error: 'Only hosts can update permissions' }
    }

    // Don't allow changing host permissions
    if (member.is_host) {
      return { success: false, error: 'Cannot modify host permissions' }
    }

    await sql`
      UPDATE scholium_members 
      SET 
        can_add_homework = ${permissions.can_add_homework},
        can_create_subject = ${permissions.can_create_subject}
      WHERE id = ${memberId}
    `

    revalidatePath('/dashboard')
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('[v0] Error updating permissions:', error)
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

    // Check if user is host
    const hostCheck = await sql`
      SELECT id FROM scholium_members
      WHERE scholium_id = ${scholiumId} AND user_id = ${user.id} AND is_host = true
    `

    if (hostCheck.length === 0) {
      return { success: false, error: 'Only hosts can edit time slots' }
    }

    // Validate slot count
    if (slots.length < 4 || slots.length > 10) {
      return { success: false, error: 'Time slots must be between 4 and 10' }
    }

    const slotsJson = JSON.stringify(slots)

    await sql`
      UPDATE scholiums
      SET time_slots = ${slotsJson}
      WHERE id = ${scholiumId}
    `

    return { success: true }
  } catch (error) {
    console.error('[v0] Error updating time slots:', error)
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
    const result = await sql`
      SELECT time_slots FROM scholiums WHERE id = ${scholiumId}
    `

    if (result.length === 0) {
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

    const slots = (result[0] as any).time_slots
    if (!slots) {
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

    // JSONB columns return objects directly, not JSON strings
    if (typeof slots === 'string') {
      return JSON.parse(slots)
    }
    
    return slots
  } catch (error) {
    console.error('[v0] Error fetching time slots:', error)
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
