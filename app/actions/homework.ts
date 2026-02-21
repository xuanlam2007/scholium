"use server"

import { createClient } from "@/lib/supabase/server"
import type { Homework, Subject, Attachment } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getCurrentScholiumId } from "@/app/actions/scholium"
import { revalidatePath } from "next/cache"

export async function getSubjects(): Promise<Subject[]> {
  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('scholium_id', scholiumId)
    .order('name')

  if (error) {
    console.error('Error fetching subjects:', error)
    return []
  }

  return data as Subject[]
}

export async function getHomework(): Promise<Homework[]> {
  const user = await getSession()
  if (!user) return []

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('homework')
    .select(`
      *,
      subjects (
        name,
        color
      ),
      homework_completion (
        user_id
      )
    `)
    .eq('scholium_id', scholiumId)
    .order('due_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching homework:', error)
    return []
  }

  // Transform data to match expected format
  return data.map((hw: any) => ({
    ...hw,
    subject_name: hw.subjects?.name,
    subject_color: hw.subjects?.color,
    completed: hw.homework_completion?.some((hc: any) => hc.user_id === user.id) || false,
  })) as Homework[]
}

export async function getHomeworkById(id: number): Promise<Homework | null> {
  const user = await getSession()
  if (!user) return null

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('homework')
    .select(`
      *,
      subjects (
        name,
        color
      ),
      homework_completion (
        user_id
      )
    `)
    .eq('id', id)
    .eq('scholium_id', scholiumId)
    .single()

  if (error) {
    console.error('Error fetching homework by id:', error)
    return null
  }

  // Transform data
  return {
    ...data,
    subject_name: data.subjects?.name,
    subject_color: data.subjects?.color,
    completed: data.homework_completion?.some((hc: any) => hc.user_id === user.id) || false,
  } as Homework
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

  const supabase = await createClient()

  // Check if user is a member of this scholium
  const { data: memberCheck } = await supabase
    .from('scholium_members')
    .select('id')
    .eq('scholium_id', scholiumId)
    .eq('user_id', user.id)
    .single()

  if (!memberCheck) {
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

  const { error } = await supabase
    .from('homework')
    .insert({
      title,
      description: description || null,
      subject_id: subjectId ? parseInt(subjectId) : null,
      due_date: dueDate,
      homework_type: homeworkType ? homeworkType.toLowerCase() : null,
      start_time: startTime || null,
      end_time: endTime || null,
      created_by: user.id,
      scholium_id: scholiumId,
    })

  if (error) {
    console.error('Error creating homework:', error)
    return { error: "Failed to create homework" }
  }

  revalidatePath("/dashboard")
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

  const supabase = await createClient()

  // Verify homework belongs to this scholium
  const { data: homework } = await supabase
    .from('homework')
    .select('id')
    .eq('id', id)
    .eq('scholium_id', scholiumId)
    .single()

  if (!homework) {
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

  const { error } = await supabase
    .from('homework')
    .update({
      title,
      description: description || null,
      subject_id: subjectId ? parseInt(subjectId) : null,
      due_date: dueDate,
      homework_type: homeworkType || null,
      start_time: startTime || null,
      end_time: endTime || null,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating homework:', error)
    return { error: "Failed to update homework" }
  }

  revalidatePath("/dashboard")
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

  const supabase = await createClient()

  // Verify homework belongs to this scholium
  const { data: homework } = await supabase
    .from('homework')
    .select('id')
    .eq('id', id)
    .eq('scholium_id', scholiumId)
    .single()

  if (!homework) {
    return { error: "Homework not found" }
  }

  const { error } = await supabase
    .from('homework')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting homework:', error)
    return { error: "Failed to delete homework" }
  }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function toggleHomeworkCompletion(homeworkId: number) {
  const user = await getSession()
  if (!user) return { error: "Unauthorized" }

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) return { error: "No scholium selected" }

  const supabase = await createClient()

  // Check if already completed
  const { data: existing } = await supabase
    .from('homework_completion')
    .select('*')
    .eq('homework_id', homeworkId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // Delete completion
    const { error } = await supabase
      .from('homework_completion')
      .delete()
      .eq('homework_id', homeworkId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting completion:', error)
      return { error: "Failed to update completion" }
    }
  } else {
    // Insert completion
    const { error } = await supabase
      .from('homework_completion')
      .insert({
        homework_id: homeworkId,
        user_id: user.id,
        completed: true,
        completed_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error creating completion:', error)
      return { error: "Failed to update completion" }
    }
  }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function getAttachments(homeworkId: number): Promise<Attachment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('homework_id', homeworkId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching attachments:', error)
    return []
  }

  return data as Attachment[]
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

  const supabase = await createClient()

  // Verify homework belongs to this scholium
  const { data: homework } = await supabase
    .from('homework')
    .select('id')
    .eq('id', homeworkId)
    .eq('scholium_id', scholiumId)
    .single()

  if (!homework) {
    return { error: "Homework not found" }
  }

  const { error } = await supabase
    .from('attachments')
    .insert({
      homework_id: homeworkId,
      file_name: fileName,
      file_url: fileUrl,
      file_size: fileSize,
      uploaded_by: user.id,
    })

  if (error) {
    console.error('Error adding attachment:', error)
    return { error: "Failed to add attachment" }
  }

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

  const supabase = await createClient()

  // Verify attachment's homework belongs to this scholium
  const { data: attachment } = await supabase
    .from('attachments')
    .select(`
      id,
      homework:homework_id (
        scholium_id
      )
    `)
    .eq('id', id)
    .single()

  if (!attachment || (attachment as any).homework?.scholium_id !== scholiumId) {
    return { error: "Attachment not found" }
  }

  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting attachment:', error)
    return { error: "Failed to delete attachment" }
  }

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

  const supabase = await createClient()

  // Check if user has permission to create subjects
  const { data: memberCheck } = await supabase
    .from('scholium_members')
    .select('can_create_subject, is_host')
    .eq('scholium_id', scholiumId)
    .eq('user_id', user.id)
    .single()

  if (!memberCheck) {
    return { error: "You are not a member of this scholium", success: false }
  }

  const canCreateSubject = memberCheck.is_host || memberCheck.can_create_subject

  if (!canCreateSubject) {
    return { error: "You do not have permission to create subjects", success: false }
  }

  if (!name.trim()) {
    return { error: "Subject name is required", success: false }
  }

  const { error } = await supabase
    .from('subjects')
    .insert({
      name,
      color,
      scholium_id: scholiumId,
    })

  if (error) {
    console.error('Error creating subject:', error)
    return { error: "Failed to create subject", success: false }
  }

  revalidatePath("/dashboard")
  return { success: true }
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

  const supabase = await createClient()

  // Verify subject belongs to this scholium
  const { data: subject } = await supabase
    .from('subjects')
    .select('id')
    .eq('id', id)
    .eq('scholium_id', scholiumId)
    .single()

  if (!subject) {
    return { error: "Subject not found", success: false }
  }

  if (!name.trim()) {
    return { error: "Subject name is required", success: false }
  }

  const { error } = await supabase
    .from('subjects')
    .update({
      name,
      color,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating subject:', error)
    return { error: "Failed to update subject", success: false }
  }

  revalidatePath("/dashboard")
  return { success: true }
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

  const supabase = await createClient()

  // Check if user has permission to delete subjects (must be host)
  const { data: hostCheck } = await supabase
    .from('scholium_members')
    .select('id')
    .eq('scholium_id', scholiumId)
    .eq('user_id', user.id)
    .eq('is_host', true)
    .single()

  if (!hostCheck) {
    return { error: "Only hosts can delete subjects", success: false }
  }

  // Verify subject belongs to this scholium
  const { data: subject } = await supabase
    .from('subjects')
    .select('id')
    .eq('id', id)
    .eq('scholium_id', scholiumId)
    .single()

  if (!subject) {
    return { error: "Subject not found", success: false }
  }

  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting subject:', error)
    return { error: "Failed to delete subject", success: false }
  }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function getUpcomingDeadlines(): Promise<Homework[]> {
  const user = await getSession()
  if (!user) return []

  const scholiumId = await getCurrentScholiumId()
  if (!scholiumId) return []

  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('homework')
    .select(`
      *,
      subjects (
        name,
        color
      ),
      homework_completion!left (
        user_id
      )
    `)
    .eq('scholium_id', scholiumId)
    .gte('due_date', today)
    .lte('due_date', sevenDaysLater)
    .order('due_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(5)

  if (error) {
    console.error('Error fetching upcoming deadlines:', error)
    return []
  }

  // Filter out completed homework and transform data
  return data
    .filter((hw: any) => !hw.homework_completion?.some((hc: any) => hc.user_id === user.id))
    .map((hw: any) => ({
      ...hw,
      subject_name: hw.subjects?.name,
      subject_color: hw.subjects?.color,
      completed: false,
    })) as Homework[]
}
