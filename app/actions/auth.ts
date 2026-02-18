"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string

  if (!email || !password || !name) {
    return { error: "All fields are required" }
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" }
  }

  const supabase = await createClient()

  // Sign up the user with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: 'student',
      },
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || 
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/scholiums`
    },
  })

  if (authError) {
    console.error('[v0] Sign up error:', authError)
    if (authError.message.includes('already registered')) {
      return { error: "Email already registered" }
    }
    if (authError.message.includes('rate limit') || authError.message.includes('Email rate limit exceeded')) {
      return { 
        error: "Too many sign up attempts. Please wait a few minutes and try again, or contact support." 
      }
    }
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: "Failed to create account" }
  }

  // Check if email confirmation is required
  if (authData.session) {
    // User is logged in immediately (email confirmation disabled)
    // The database trigger automatically creates the user profile
    console.log('[v0] User signed up successfully:', authData.user.email)
    redirect("/scholiums")
  } else {
    // Email confirmation required
    return { 
      success: true, 
      message: "Please check your email to confirm your account before signing in." 
    }
  }
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('[v0] Sign in error:', error)
    return { error: "Invalid email or password" }
  }

  if (!data.user) {
    return { error: "Invalid email or password" }
  }

  // Check role from auth user metadata (set during signup)
  const role = data.user.user_metadata?.role

  if (role === "admin") {
    redirect("/admin")
  }
  redirect("/scholiums")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
