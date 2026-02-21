import { createClient } from "@/lib/supabase/server"
import type { User } from "./db"




export async function getSession(): Promise<User | null> {
  try {

    const supabase = await createClient()
    const { data: { user: authUser }, error } = await supabase.auth.getUser()
    if (error || !authUser) return null
    return {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.name || 'User',
      role: authUser.user_metadata?.role || 'student',
      created_at: authUser.created_at || new Date().toISOString(),
    }
  } catch (error) {
    return null
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getSession()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth()
  if (user.role !== "admin") {
    throw new Error("Forbidden")
  }
  return user
}


