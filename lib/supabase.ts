import { createClient } from "@supabase/supabase-js"
import type { UserClassification } from "@/types/user"

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Verify that environment variables are available
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing Supabase environment variables. Authentication features will be limited.")
}

// Create the client only if we have the required variables
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

// Function to get user classification based on last login time
export const getUserClassification = (lastLoginTime: string | null): UserClassification => {
  if (!lastLoginTime) return "Nuevo"

  const now = new Date()
  const lastLogin = new Date(lastLoginTime)
  const hoursSinceLastLogin = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60)

  if (hoursSinceLastLogin <= 12) {
    return "Hechicero"
  } else if (hoursSinceLastLogin <= 48) {
    return "Luchador"
  } else if (hoursSinceLastLogin <= 7 * 24) {
    return "Explorador"
  } else {
    return "Olvidado"
  }
}

// Function to update last login time in localStorage
export const updateLastLogin = (userId: string): { classification: UserClassification; lastLogin: string } => {
  try {
    const now = new Date().toISOString()
    const userKey = `user_${userId}`

    // Get existing user data from localStorage
    const userData = localStorage.getItem(userKey)
    let lastLogin = null

    if (userData) {
      const parsedData = JSON.parse(userData)
      lastLogin = parsedData.lastLogin
    }

    // Calculate classification
    const classification = getUserClassification(lastLogin)

    // Update localStorage
    localStorage.setItem(
      userKey,
      JSON.stringify({
        lastLogin: now,
        previousLogin: lastLogin || now,
        classification,
        updatedAt: now,
      }),
    )

    return { classification, lastLogin: now }
  } catch (error) {
    console.error("Error updating last login:", error)
    return { classification: "Nuevo", lastLogin: new Date().toISOString() }
  }
}

// Function to get user data from localStorage
export const getUserData = (userId: string) => {
  try {
    const userKey = `user_${userId}`
    const userData = localStorage.getItem(userKey)

    if (userData) {
      return JSON.parse(userData)
    }

    return null
  } catch (error) {
    console.error("Error getting user data:", error)
    return null
  }
}

// Authentication functions
export const loginWithEmailAndPassword = async (email: string, password: string) => {
  try {
    console.log("Attempting login with:", email)

    // Check if Supabase is initialized
    if (!supabase) {
      throw new Error("Supabase client not initialized. Check your environment variables.")
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Supabase login error:", error)
      throw error
    }

    console.log("Login successful, user:", data.user.id)

    // Update last login time in localStorage
    const { classification } = updateLastLogin(data.user.id)

    return {
      user: data.user,
      classification,
      error: null,
    }
  } catch (error: any) {
    console.error("Login error:", error)
    return {
      user: null,
      classification: null,
      error: error.message,
    }
  }
}

export const registerWithEmailAndPassword = async (email: string, password: string, name?: string) => {
  try {
    console.log("Attempting registration with:", email)

    // Check if Supabase is initialized
    if (!supabase) {
      throw new Error("Supabase client not initialized. Check your environment variables.")
    }

    // First, sign up the user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name || null,
        },
      },
    })

    if (error) {
      console.error("Supabase registration error:", error)
      throw error
    }

    if (!data.user) {
      throw new Error("User registration failed - no user returned")
    }

    console.log("Registration successful, user:", data.user.id)

    // Initialize user data in localStorage
    const now = new Date().toISOString()
    const userKey = `user_${data.user.id}`

    localStorage.setItem(
      userKey,
      JSON.stringify({
        email,
        fullName: name || null,
        createdAt: now,
        lastLogin: now,
        classification: "Nuevo",
        updatedAt: now,
      }),
    )

    return { user: data.user, error: null }
  } catch (error: any) {
    console.error("Registration error:", error)
    return { user: null, error: error.message }
  }
}

export const logoutUser = async () => {
  try {
    // Check if Supabase is initialized
    if (!supabase) {
      throw new Error("Supabase client not initialized. Check your environment variables.")
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("Logout error:", error)
      throw error
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error("Logout error:", error)
    return { success: false, error: error.message }
  }
}

export const ensureProfileExists = async (userId: string, email: string, name?: string) => {
  try {
    // Check if Supabase is initialized
    if (!supabase) {
      throw new Error("Supabase client not initialized. Check your environment variables.")
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (error && error.code !== "PGRST116") {
      // Ignore "no data found" error
      console.error("Error checking profile existence:", error)
      throw error
    }

    if (!data) {
      // Profile does not exist, create it
      const { error: insertError } = await supabase.from("profiles").insert([
        {
          id: userId,
          email: email,
          full_name: name,
        },
      ])

      if (insertError) {
        console.error("Error creating profile:", insertError)
        throw insertError
      }

      console.log("Profile created for user:", userId)
    } else {
      console.log("Profile already exists for user:", userId)
    }
  } catch (error: any) {
    console.error("Error ensuring profile exists:", error)
    throw error
  }
}

