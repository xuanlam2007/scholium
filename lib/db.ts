// Type definitions for database entities
// This file only contains types - no server or client imports
// Server components/actions should use: import { createClient } from "@/lib/supabase/server"
// Client components should use: import { createClient } from "@/lib/supabase/client"
export type User = {
  id: string // Changed from number to string for UUID
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
  created_by: string | null // Changed from number to string for UUID
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
  uploaded_by: string | null // Changed from number to string for UUID
  created_at: string
}
