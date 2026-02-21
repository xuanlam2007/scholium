export type User = {
  id: string
  email: string
  name: string
  role: "admin" | "student"
  created_at: string
}

export type Subject = {
  id: number
  name: string
  color: string
  scholium_id?: number
}

export type Homework = {
  id: number
  title: string
  description: string | null
  subject_id: number | null
  subject_name?: string
  subject_color?: string
  due_date: string
  homework_type: string | null
  start_time: string | null
  end_time: string | null
  created_by: string | null
  scholium_id: number
  created_at: string
  completed?: boolean
}

export const HOMEWORK_TYPES = [
  "assignment",
  "vocabulary",
  "essay",
  "workbook",
  "project",
  "quiz",
  "exam",
  "presentation",
  "reading",
  "other",
] as const

export type Attachment = {
  id: number
  homework_id: number
  file_name: string
  file_url: string
  file_size: number | null
  uploaded_by: string | null
  created_at: string
}
