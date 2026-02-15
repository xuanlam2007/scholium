import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

const _sql: NeonQueryFunction<false, false> | null = null

function createSql() {
  const connectionString = process.env.SCHOLIUM_DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  return neon(connectionString)
}

export const sql = (strings: TemplateStringsArray, ...values: any[]) => {
  const db = createSql()
  return db(strings, ...values)
}

export type User = {
  id: number
  email: string
  name: string
  role: "admin" | "student"
  email_verified: boolean
  created_at: string
}

export type Subject = {
  id: number
  name: string
  color: string
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
  created_by: number | null
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
  uploaded_by: number | null
  created_at: string
}
