"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { loginWithEmailAndPassword, supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import type { UserClassification } from "@/types/user"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [classification, setClassification] = useState<UserClassification | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== "undefined") {
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      console.log("Login form submitted with email:", email)

      if (!supabase) {
        throw new Error("Supabase client not initialized. Check your environment variables.")
      }

      const { user, classification: userClass, error: loginError } = await loginWithEmailAndPassword(email, password)

      if (loginError) {
        console.error("Login error from service:", loginError)
        throw new Error(loginError)
      }

      if (user) {
        console.log("Login successful, user:", user.id)
        console.log("User classification:", userClass)

        setClassification(userClass as UserClassification)

        setTimeout(() => {
          router.push("/dashboard")
        }, 2000)
      } else {
        throw new Error("No user returned from login")
      }
    } catch (err: any) {
      console.error("Login form error:", err)

      if (err.message.includes("Supabase client not initialized")) {
        setError("Authentication service is not available. Please try again later or contact support.")
      } else if (err.message.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.")
      } else if (err.message.includes("Email not confirmed")) {
        setError("Please confirm your email before logging in.")
      } else {
        setError(err.message || "Failed to login. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Login</CardTitle>
        <CardDescription>Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {classification && (
            <Alert className="bg-primary/10 border-primary/20">
              <div className="flex flex-col space-y-2">
                <AlertDescription>¡Bienvenido de nuevo! Tu clasificación actual es:</AlertDescription>
                <Badge
                  className={`self-start ${
                    classification === "Hechicero"
                      ? "bg-purple-500"
                      : classification === "Luchador"
                        ? "bg-red-500"
                        : classification === "Explorador"
                          ? "bg-green-500"
                          : classification === "Olvidado"
                            ? "bg-gray-500"
                            : "bg-blue-500"
                  }`}
                >
                  {classification}
                </Badge>
              </div>
            </Alert>
          )}

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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Button
                variant="link"
                className="p-0 h-auto font-normal text-xs"
                type="button"
                onClick={() => router.push("/forgot-password")}
              >
                Forgot password?
              </Button>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>
          <p className="text-sm text-center">
            Don't have an account?{" "}
            <Button variant="link" className="p-0 h-auto" type="button" onClick={() => router.push("/register")}>
              Sign up
            </Button>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
