"use server"

import { sql, type Homework, type Subject, type Attachment } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getCurrentScholiumId } from "@/app/actions/scholium"
// import { revalidatePath } from "next/cache"
// import { cookies } from "next/headers"

// Fetch subjects
export async function getSubjects(): Promise<Subject[]> {
  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) return []

  const result = await sql`SELECT * FROM subjects WHERE scholium_id = ${scholiumId} ORDER BY name`

  return result as Subject[]

}

// Feth homework with subject details and completion status
export async function getHomework(): Promise<Homework[]> {
  const user = await getSession()
  if (!user) return []

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) return []

  const result = await sql`
    SELECT 
      h.*,
      s.name as subject_name,
      s.color as subject_color,
      CASE WHEN hc.user_id IS NOT NULL THEN true ELSE false END as completed
    FROM homework h
    LEFT JOIN subjects s ON h.subject_id = s.id
    LEFT JOIN homework_completion hc ON h.id = hc.homework_id AND hc.user_id = ${user.id}
    WHERE h.scholium_id = ${scholiumId}
    ORDER BY h.due_date ASC, h.start_time ASC
  `
  return result as Homework[]
}