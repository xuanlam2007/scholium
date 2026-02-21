"use server"

import { createClient } from "@/lib/supabase/server"
import type { User } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getAllUsers(): Promise<User[]> {
  await requireAdmin()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all users:', error)
    return []
  }

  return data as User[]
}

export async function getAllScholiums() {
  await requireAdmin()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scholiums')
    .select(`
      id,
      name,
      created_at,
      users!scholiums_user_id_fkey (
        name,
        email
      ),
      scholium_members (
        user_id
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all scholiums:', error)
    return []
  }

  // Transform the data to match expected format
  return data.map((scholium: any) => ({
    id: scholium.id,
    name: scholium.name,
    created_at: scholium.created_at,
    creator_name: scholium.users?.name || 'Unknown',
    creator_email: scholium.users?.email || '',
    member_count: scholium.scholium_members?.length || 0,
  }))
}

export async function deleteScholium(scholiumId: number) {
  await requireAdmin()

  const supabase = await createClient()

  const { error } = await supabase
    .from('scholiums')
    .delete()
    .eq('id', scholiumId)

  if (error) {
    console.error('Error deleting scholium:', error)
    return { success: false, error: 'Failed to delete scholium' }
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function updateUserRole(userId: string, role: "admin" | "student") {
  await requireAdmin()

  const supabase = await createClient()

  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)

  if (error) {
    console.error('Error updating user role:', error)
    return { success: false, error: 'Failed to update user role' }
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function deleteUser(userId: string) {
  await requireAdmin()

  const supabase = await createClient()

  // Delete from Supabase Auth
  const { error: authError } = await supabase.auth.admin.deleteUser(userId)

  if (authError) {
    console.error('Error deleting user from auth:', authError)
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function createUser(formData: FormData) {
  await requireAdmin()

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string
  const role = formData.get("role") as "admin" | "student"

  if (!email || !password || !name) {
    return { error: "All fields are required" }
  }

  const supabase = await createClient()

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: role || 'student',
      },
    },
  })

  if (authError) {
    console.error('Error creating user:', authError)
    if (authError.message.includes('already registered')) {
      return { error: "Email already registered" }
    }
    return { error: authError.message }
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function getScholiumMembers(scholiumId: number) {
  await requireAdmin()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scholium_members')
    .select(`
      id,
      user_id,
      scholium_id,
      is_host,
      can_add_homework,
      can_create_subject,
      joined_at,
      users (
        name,
        email,
        role
      )
    `)
    .eq('scholium_id', scholiumId)
    .order('is_host', { ascending: false })
    .order('joined_at', { ascending: true })

  if (error) {
    console.error('Error fetching scholium members:', error)
    return []
  }

  // Transform data to match format
  return data.map((member: any) => ({
    id: member.id,
    user_id: member.user_id,
    scholium_id: member.scholium_id,
    is_host: member.is_host,
    can_add_homework: member.can_add_homework,
    can_create_subject: member.can_create_subject,
    joined_at: member.joined_at,
    user_name: member.users?.name || 'Unknown',
    user_email: member.users?.email || '',
    user_role: member.users?.role || 'student',
  }))
}

export async function removeScholiumMember(memberId: number) {
  await requireAdmin()

  const supabase = await createClient()

  const { error } = await supabase
    .from('scholium_members')
    .delete()
    .eq('id', memberId)

  if (error) {
    console.error('Error removing scholium member:', error)
    return { success: false, error: 'Failed to remove member' }
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function updateScholiumMemberPermissions(
  memberId: number,
  permissions: {
    can_add_homework: boolean
    can_create_subject: boolean
  }
) {
  await requireAdmin()

  const supabase = await createClient()

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

  revalidatePath("/admin")
  return { success: true }
}

export async function getAllUsersForScholium(scholiumId: number) {
  await requireAdmin()

  const supabase = await createClient()

  // Get all user IDs who are already members
  const { data: members } = await supabase
    .from('scholium_members')
    .select('user_id')
    .eq('scholium_id', scholiumId)

  const memberIds = members?.map(m => m.user_id) || []

  // Get all users who are not members
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role')
    .neq('role', 'admin')
    .order('name')
  if (error) {
    console.error('Error fetching users for scholium:', error)
    return []
  }
  // Filter out existing members
  return data.filter((user: any) => !memberIds.includes(user.id))
}

export async function addMemberToScholium(scholiumId: number, userId: string) {
  await requireAdmin()

  const supabase = await createClient()

  const { error } = await supabase
    .from('scholium_members')
    .insert({
      scholium_id: scholiumId,
      user_id: userId,
      is_host: false,
      can_add_homework: true,
      can_create_subject: false,
    })

  if (error) {
    console.error('Error adding member to scholium:', error)
    return { success: false, error: 'Failed to add member' }
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function transferScholiumHost(scholiumId: number, newHostMemberId: number) {
  await requireAdmin()

  const supabase = await createClient()

  // Remove host from current host
  const { error: removeError } = await supabase
    .from('scholium_members')
    .update({ is_host: false })
    .eq('scholium_id', scholiumId)
    .eq('is_host', true)
  if (removeError) {
    console.error('Error removing old host:', removeError)
    return { success: false, error: 'Failed to transfer host' }
  }

  // Set new host
  const { error: setError } = await supabase
    .from('scholium_members')
    .update({
      is_host: true,
      can_add_homework: true,
      can_create_subject: true,
    })
    .eq('id', newHostMemberId)

  if (setError) {
    console.error('Error setting new host:', setError)
    return { success: false, error: 'Failed to transfer host' }
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function getAdminStats() {
  await requireAdmin()
  const supabase = await createClient()

  const [
    { count: usersCount },
    { count: scholiumsCount },
    { count: homeworkCount },
    { count: completionsCount },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('scholiums').select('*', { count: 'exact', head: true }),
    supabase.from('homework').select('*', { count: 'exact', head: true }),
    supabase.from('homework_completion').select('*', { count: 'exact', head: true }),
  ])

  return {
    totalUsers: usersCount || 0,
    totalScholiums: scholiumsCount || 0,
    totalHomework: homeworkCount || 0,
    totalCompletions: completionsCount || 0,
  }
}
