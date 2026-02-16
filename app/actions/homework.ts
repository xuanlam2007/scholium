"use server"

import { sql, type Homework, type Subject, type Attachment } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getCurrentScholiumId } from "@/app/actions/scholium"
import { broadcastChange } from "@/lib/realtime"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

export async function getSubjects(): Promise<Subject[]> {
  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) return []

  const result = await sql`SELECT * FROM subjects WHERE scholium_id = ${scholiumId} ORDER BY name`
  return result as Subject[]
}

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

export async function getHomeworkById(id: number): Promise<Homework | null> {
  const user = await getSession()
  if (!user) return null

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) return null

  const result = await sql`
    SELECT 
      h.*,
      s.name as subject_name,
      s.color as subject_color,
      CASE WHEN hc.user_id IS NOT NULL THEN true ELSE false END as completed
    FROM homework h
    LEFT JOIN subjects s ON h.subject_id = s.id
    LEFT JOIN homework_completion hc ON h.id = hc.homework_id AND hc.user_id = ${user.id}
    WHERE h.id = ${id} AND h.scholium_id = ${scholiumId}
  `
  return (result[0] as Homework) || null
}

export async function createHomework(formData: FormData) {
  const user = await getSession()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) {
    return { error: "No scholium selected" }
  }

  // Check if user is a member of this scholium
  const memberCheck = await sql`
    SELECT id FROM scholium_members
    WHERE scholium_id = ${scholiumId} AND user_id = ${user.id}
  `

  if (memberCheck.length === 0) {
    return { error: "You are not a member of this scholium" }
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const subjectId = formData.get("subject_id") as string
  const dueDate = formData.get("due_date") as string
  const homeworkType = formData.get("homework_type") as string
  const startTime = formData.get("start_time") as string
  const endTime = formData.get("end_time") as string

  if (!title || !dueDate) {
    return { error: "Title and due date are required" }
  }

  await sql`
    INSERT INTO homework (title, description, subject_id, due_date, homework_type, start_time, end_time, created_by, scholium_id)
    VALUES (
      ${title}, 
      ${description || null}, 
      ${subjectId ? Number.parseInt(subjectId) : null}, 
      ${dueDate},
      ${homeworkType ? homeworkType.toLowerCase() : null},
      ${startTime || null},
      ${endTime || null},
      ${user.id},
      ${scholiumId}
    )
  `

  revalidatePath("/dashboard")
  await broadcastChange(scholiumId, 'homework')
  return { success: true }
}

export async function updateHomework(id: number, formData: FormData) {
  const user = await getSession()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) {
    return { error: "No scholium selected" }
  }

  // Verify homework belongs to this scholium
  const homework = await sql`
    SELECT id FROM homework WHERE id = ${id} AND scholium_id = ${scholiumId}
  `

  if (homework.length === 0) {
    return { error: "Homework not found" }
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const subjectId = formData.get("subject_id") as string
  const dueDate = formData.get("due_date") as string
  const homeworkType = formData.get("homework_type") as string
  const startTime = formData.get("start_time") as string
  const endTime = formData.get("end_time") as string

  if (!title || !dueDate) {
    return { error: "Title and due date are required" }
  }

  await sql`
    UPDATE homework
    SET title = ${title}, 
        description = ${description || null}, 
        subject_id = ${subjectId ? Number.parseInt(subjectId) : null}, 
        due_date = ${dueDate},
        homework_type = ${homeworkType || null},
        start_time = ${startTime || null},
        end_time = ${endTime || null}
    WHERE id = ${id}
  `

  revalidatePath("/dashboard")
  await broadcastChange(scholiumId, 'homework')
  return { success: true }
}

export async function deleteHomework(id: number) {
  const user = await getSession()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) {
    return { error: "No scholium selected" }
  }

  // Verify homework belongs to this scholium
  const homework = await sql`
    SELECT id FROM homework WHERE id = ${id} AND scholium_id = ${scholiumId}
  `

  if (homework.length === 0) {
    return { error: "Homework not found" }
  }

  await sql`DELETE FROM homework WHERE id = ${id}`

  revalidatePath("/dashboard")
  await broadcastChange(scholiumId, 'homework')
  return { success: true }
}

export async function toggleHomeworkCompletion(homeworkId: number) {
  const user = await getSession()
  if (!user) return { error: "Unauthorized" }

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) return { error: "No scholium selected" }

  const existing = await sql`
    SELECT * FROM homework_completion 
    WHERE homework_id = ${homeworkId} AND user_id = ${user.id}
  `

  if (existing.length > 0) {
    await sql`
      DELETE FROM homework_completion 
      WHERE homework_id = ${homeworkId} AND user_id = ${user.id}
    `
  } else {
    await sql`
      INSERT INTO homework_completion (homework_id, user_id)
      VALUES (${homeworkId}, ${user.id})
    `
  }

  revalidatePath("/dashboard")
  await broadcastChange(scholiumId, 'homework')
  return { success: true }
}

export async function getAttachments(homeworkId: number): Promise<Attachment[]> {
  const result = await sql`
    SELECT * FROM attachments WHERE homework_id = ${homeworkId} ORDER BY created_at DESC
  `
  return result as Attachment[]
}

export async function addAttachment(homeworkId: number, fileName: string, fileUrl: string, fileSize: number) {
  const user = await getSession()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) {
    return { error: "No scholium selected" }
  }

  // Verify homework belongs to this scholium
  const homework = await sql`
    SELECT id FROM homework WHERE id = ${homeworkId} AND scholium_id = ${scholiumId}
  `

  if (homework.length === 0) {
    return { error: "Homework not found" }
  }

  await sql`
    INSERT INTO attachments (homework_id, file_name, file_url, file_size, uploaded_by)
    VALUES (${homeworkId}, ${fileName}, ${fileUrl}, ${fileSize}, ${user.id})
  `

  revalidatePath("/dashboard")
  return { success: true }
}

export async function deleteAttachment(id: number) {
  const user = await getSession()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) {
    return { error: "No scholium selected" }
  }

  // Verify attachment's homework belongs to this scholium
  const attachment = await sql`
    SELECT a.id FROM attachments a
    INNER JOIN homework h ON a.homework_id = h.id
    WHERE a.id = ${id} AND h.scholium_id = ${scholiumId}
  `

  if (attachment.length === 0) {
    return { error: "Attachment not found" }
  }

  await sql`DELETE FROM attachments WHERE id = ${id}`

  revalidatePath("/dashboard")
  return { success: true }
}

export async function createSubject(name: string, color: string) {
  const user = await getSession()
  if (!user) {
    return { error: "Unauthorized", success: false }
  }

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) {
    return { error: "No scholium selected", success: false }
  }

  // Check if user has permission to create subjects
  const memberCheck = await sql`
    SELECT can_create_subject, is_host FROM scholium_members
    WHERE scholium_id = ${scholiumId} AND user_id = ${user.id}
  `

  if (memberCheck.length === 0) {
    return { error: "You are not a member of this scholium", success: false }
  }

  const member = memberCheck[0] as any
  const canCreateSubject = member.is_host || member.can_create_subject
  
  if (!canCreateSubject) {
    return { error: "You do not have permission to create subjects", success: false }
  }

  if (!name.trim()) {
    return { error: "Subject name is required", success: false }
  }

  try {
    await sql`
      INSERT INTO subjects (name, color, scholium_id)
      VALUES (${name}, ${color}, ${scholiumId})
    `

    revalidatePath("/dashboard")
    await broadcastChange(scholiumId, 'subject')
    return { success: true }
  } catch (error) {
    console.error('Error creating subject:', error)
    return { error: "Failed to create subject", success: false }
  }
}

export async function updateSubject(id: number, name: string, color: string) {
  const user = await getSession()
  if (!user) {
    return { error: "Unauthorized", success: false }
  }

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) {
    return { error: "No scholium selected", success: false }
  }

  // Verify subject belongs to this scholium
  const subject = await sql`
    SELECT id FROM subjects WHERE id = ${id} AND scholium_id = ${scholiumId}
  `

  if (subject.length === 0) {
    return { error: "Subject not found", success: false }
  }

  if (!name.trim()) {
    return { error: "Subject name is required", success: false }
  }

  try {
    await sql`
      UPDATE subjects
      SET name = ${name}, color = ${color}
      WHERE id = ${id}
    `

    revalidatePath("/dashboard")
    await broadcastChange(scholiumId, 'subject')
    return { success: true }
  } catch (error) {
    console.error('Error updating subject:', error)
    return { error: "Failed to update subject", success: false }
  }
}

export async function deleteSubject(id: number) {
  const user = await getSession()
  if (!user) {
    return { error: "Unauthorized", success: false }
  }

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) {
    return { error: "No scholium selected", success: false }
  }

  // Check if user has permission to delete subjects (must be host)
  const hostCheck = await sql`
    SELECT id FROM scholium_members
    WHERE scholium_id = ${scholiumId} AND user_id = ${user.id} AND is_host = true
  `

  if (hostCheck.length === 0) {
    return { error: "Only hosts can delete subjects", success: false }
  }

  // Verify subject belongs to this scholium
  const subject = await sql`
    SELECT id FROM subjects WHERE id = ${id} AND scholium_id = ${scholiumId}
  `

  if (subject.length === 0) {
    return { error: "Subject not found", success: false }
  }

  try {
    await sql`DELETE FROM subjects WHERE id = ${id}`

    revalidatePath("/dashboard")
    await broadcastChange(scholiumId, 'subject')
    return { success: true }
  } catch (error) {
    console.error('Error deleting subject:', error)
    return { error: "Failed to delete subject", success: false }
  }
}

export async function getUpcomingDeadlines(): Promise<Homework[]> {
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
      AND h.due_date >= CURRENT_DATE 
      AND h.due_date <= CURRENT_DATE + INTERVAL '7 days'
      AND hc.user_id IS NULL
    ORDER BY h.due_date ASC, h.start_time ASC
    LIMIT 5
  `
  return result as Homework[]
}
