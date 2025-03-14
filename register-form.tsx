"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { registerWithEmailAndPassword, supabase, ensureProfileExists } from "@/lib/supabase"

export default function RegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Add error handling for missing Supabase client
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      console.log("Registration form submitted with email:", email)

      // Check if Supabase is initialized correctly
      if (!supabase) {
        throw new Error("Supabase client not initialized. Check your environment variables.")
      }

      const { user, error: registerError } = await registerWithEmailAndPassword(email, password, name)

      if (registerError) {
        console.error("Registration error from service:", registerError)
        throw new Error(registerError)
      }

      if (user) {
        console.log("Registration successful, user:", user.id)

        // Ensure profile exists (this is a fallback in case the trigger fails)
        try {
          await ensureProfileExists(user.id, email, name)
        } catch (profileError) {
          console.error("Failed to create profile, but registration was successful:", profileError)
          // Continue with registration success even if profile creation fails
        }

        setSuccess("Account created successfully! Redirecting to login...")

        // Redirect to login page after a short delay
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        throw new Error("No user returned from registration")
      }
    } catch (err: any) {
      console.error("Registration form error:", err)

      // Handle specific Supabase auth errors with user-friendly messages
      if (err.message.includes("Supabase client not initialized")) {
        setError("Authentication service is not available. Please try again later or contact support.")
      } else if (err.message.includes("already registered")) {
        setError("Email already in use. Please use a different email or try logging in.")
      } else if (err.message.includes("valid email")) {
        setError("Invalid email address. Please check and try again.")
      } else if (err.message.includes("password")) {
        setError("Password is too weak. Please use a stronger password.")
      } else {
        setError(err.message || "Failed to create account. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>Enter your information to create an account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
          <p className="text-sm text-center">
            Already have an account?{" "}
            <Button variant="link" className="p-0 h-auto" type="button" onClick={() => router.push("/login")}>
              Log in
            </Button>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

