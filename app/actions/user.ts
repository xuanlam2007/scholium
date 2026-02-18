'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

/**
 * Update user profile
 */
export async function updateUserProfile({
  name,
  profilePictureUrl,
}: {
  name?: string
  profilePictureUrl?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()

    // Update the auth user metadata (name)
    if (name) {
      const { error: authError } = await supabase.auth.updateUser({
        data: { name },
      })

      if (authError) {
        console.error('[v0] Error updating auth metadata:', authError)
        return { success: false, error: 'Failed to update profile' }
      }

      // Also update the public.users table
      const { error: dbError } = await supabase
        .from('users')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (dbError) {
        console.error('[v0] Error updating user profile:', dbError)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[v0] Error updating profile:', error)
    return { success: false, error: 'Failed to update profile' }
  }
}

/**
 * Change password
 */
export async function changePassword({
  currentPassword,
  newPassword,
}: {
  currentPassword: string
  newPassword: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getSession()
    if (!user) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()

    // Verify current password by attempting sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (verifyError) {
      return { success: false, error: 'Current password is incorrect' }
    }

    // Update password via Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      console.error('[v0] Error changing password:', updateError)
      return { success: false, error: 'Failed to change password' }
    }

    return { success: true }
  } catch (error) {
    console.error('[v0] Error changing password:', error)
    return { success: false, error: 'Failed to change password' }
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/settings`,
    })

    if (error) {
      console.error('[v0] Error sending reset email:', error)
      return { success: false, error: 'Failed to send reset email' }
    }

    return { success: true }
  } catch (error) {
    console.error('[v0] Error sending reset email:', error)
    return { success: false, error: 'Failed to send reset email' }
  }
}
