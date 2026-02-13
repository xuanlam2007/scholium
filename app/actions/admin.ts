"use server"

import { sql, type User } from "@/lib/db"
import { requireAdmin, hashPassword } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getAllUsers(): Promise<User[]> {
  await requireAdmin()

  const result = await sql`
    SELECT id, email, name, role, created_at 
    FROM users 
    ORDER BY created_at DESC
  `
  return result as User[]
}

export async function getAllScholiums() {
  await requireAdmin()

  const result = await sql`
    SELECT 
      t.id,
      t.name,
      t.created_at,
      u.name as creator_name,
      u.email as creator_email,
      COUNT(DISTINCT tm.user_id) as member_count
    FROM scholiums t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN scholium_members tm ON t.id = tm.scholium_id
    GROUP BY t.id, t.name, t.created_at, u.name, u.email
    ORDER BY t.created_at DESC
  `
  return result
}

export async function deleteScholium(scholiumId: number) {
  await requireAdmin()

  await sql`DELETE FROM scholiums WHERE id = ${scholiumId}`

  revalidatePath("/admin")
  return { success: true }
}

export async function updateUserRole(userId: number, role: "admin" | "student") {
  await requireAdmin()

  await sql`UPDATE users SET role = ${role} WHERE id = ${userId}`

  revalidatePath("/admin")
  return { success: true }
}

export async function deleteUser(userId: number) {
  await requireAdmin()

  // Don't allow deleting yourself
  await sql`DELETE FROM sessions WHERE user_id = ${userId}`
  await sql`DELETE FROM homework_completion WHERE user_id = ${userId}`
  await sql`DELETE FROM users WHERE id = ${userId}`

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

  const existing = await sql`SELECT id FROM users WHERE email = ${email}`
  if (existing.length > 0) {
    return { error: "Email already registered" }
  }

  const passwordHash = await hashPassword(password)

  await sql`
    INSERT INTO users (email, password_hash, name, role)
    VALUES (${email}, ${passwordHash}, ${name}, ${role || "student"})
  `

  revalidatePath("/admin")
  return { success: true }
}


export async function getScholiumMembers(scholiumId: number) {
  await requireAdmin()

  const result = await sql`
    SELECT 
      sm.id,
      sm.user_id,
      sm.scholium_id,
      sm.is_host,
      sm.can_add_homework,
      sm.can_create_subject,
      sm.joined_at,
      u.name as user_name,
      u.email as user_email,
      u.role as user_role
    FROM scholium_members sm
    LEFT JOIN users u ON sm.user_id = u.id
    WHERE sm.scholium_id = ${scholiumId}
    ORDER BY sm.is_host DESC, sm.joined_at ASC
  `
  return result
}

export async function removeScholiumMember(memberId: number) {
  await requireAdmin()

  await sql`DELETE FROM scholium_members WHERE id = ${memberId}`

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

  await sql`
    UPDATE scholium_members 
    SET 
      can_add_homework = ${permissions.can_add_homework},
      can_create_subject = ${permissions.can_create_subject}
    WHERE id = ${memberId}
  `

  revalidatePath("/admin")
  return { success: true }
}


// Subjects are now managed per-scholium, not globally by admins

export async function getAdminStats() {
  await requireAdmin()

  const [users, scholiums, homework, completions] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM users`,
    sql`SELECT COUNT(*) as count FROM scholiums`,
    sql`SELECT COUNT(*) as count FROM homework`,
    sql`SELECT COUNT(*) as count FROM homework_completion`,
  ])

  return {
    totalUsers: Number(users[0].count),
    totalScholiums: Number(scholiums[0].count),
    totalHomework: Number(homework[0].count),
    totalCompletions: Number(completions[0].count),
  }
}
