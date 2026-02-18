import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.SCHOLIUM_ENCRYPTION_KEY || 'default-insecure-key-change-in-production'
const ALGORITHM = 'aes-256-cbc'

// Access ID generator
export function generateAccessId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

// Encrypts Access ID
export function encryptAccessId(id: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv)
  let encrypted = cipher.update(id, 'utf-8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

// Decrypts Access ID
export function decryptAccessId(encryptedId: string): string {
  try {
    const [ivHex, encryptedHex] = encryptedId.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf-8')
    decrypted += decipher.final('utf-8')
    return decrypted
  } catch (error) {
    throw new Error('Invalid scholium access ID')
  }
}

export type Scholium = {
  id: number
  user_id: string
  name: string
  encrypted_access_id: string
  time_slots?: Array<{ start: string; end: string }>
  created_at: string
  updated_at: string
}

export type ScholiumMember = {
  id: number
  scholium_id: number
  user_id: string
  is_host: boolean
  can_add_homework: boolean
  can_create_subject: boolean
  joined_at: string
}
