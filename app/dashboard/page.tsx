"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase, getUserData } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import UserClassificationBadge from "@/components/user-classification-badge"
import { Button } from "@/components/ui/button"
import { LogOut, User, Plus, Pencil, Trash2, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type { UserClassification } from "@/types/user"

// Actualizar la interfaz ApiUser para que coincida con la estructura real de datos
interface ApiUser {
  id: string
  nombre: string
  apellidos: string
  cedula: string
  correoElectronico: string
  fechaUltimoAcceso: string
  clasificacion?: string
}

// Define the localStorage user data type
interface LocalUserData {
  lastLogin: string
  previousLogin?: string
  classification: UserClassification
  updatedAt: string
  email?: string
  fullName?: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<LocalUserData | null>(null)
  const [apiUsers, setApiUsers] = useState<ApiUser[]>([])
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    cedula: "",
    correoElectronico: "",
  })
  const apiUrl = "http://localhost:5145/api/User"
  const router = useRouter()

  // Función para calcular el puntaje del usuario
  const calculateUserScore = (user: ApiUser): number => {
    let score = 0

    // 1. Calcular puntos por longitud del nombre completo
    const fullName = `${user.nombre} ${user.apellidos}`.trim()
    const nameLength = fullName.length

    if (nameLength > 10) {
      score += 20
    } else if (nameLength >= 5) {
      score += 10
    }
    // Si es menor a 5, no suma puntos

    // 2. Calcular puntos por dominio de correo
    const email = user.correoElectronico.toLowerCase()

    if (email.endsWith("@gmail.com")) {
      score += 40
    } else if (email.endsWith("@hotmail.com")) {
      score += 20
    } else {
      score += 10
    }

    return score
  }

  // Fetch Supabase user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Check if Supabase is initialized correctly
        if (!supabase) {
          console.error("Supabase client not initialized. Check your environment variables.")
          setLoading(false)
          return
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          console.log("No active session, redirecting to login")
          router.push("/login")
          return
        }

        setUser(session.user)

        // Get user data from localStorage
        if (typeof window !== "undefined") {
          const localData = getUserData(session.user.id)
          if (localData) {
            setUserData(localData as LocalUserData)
          }
        }
      } catch (error) {
        console.error("Error in fetchUserData:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()

    // Set up auth state change listener
    let subscription: { unsubscribe: () => void } = { unsubscribe: () => {} }

    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          setUser(session.user)

          // Get user data from localStorage
          if (typeof window !== "undefined") {
            const localData = getUserData(session.user.id)
            if (localData) {
              setUserData(localData as LocalUserData)
            }
          }
        } else {
          setUser(null)
          setUserData(null)
          router.push("/login")
        }
      })

      subscription = data.subscription
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  // Fetch API users
  const fetchApiUsers = async () => {
    setApiLoading(true)
    setApiError(null)

    try {
      console.log(`Attempting to fetch from API URL: ${apiUrl}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      // First try with standard fetch
      let response
      try {
        response = await fetch(apiUrl, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
          mode: "cors", // Try with CORS mode first
        })
      } catch (initialError) {
        console.log("Initial fetch failed, trying with no-cors mode:", initialError)
        // If that fails, try with no-cors as fallback
        response = await fetch(apiUrl, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
          mode: "no-cors", // Fallback to no-cors
        })
      }

      clearTimeout(timeoutId)

      // Log response details for debugging
      console.log(`API Response status: ${response.status} ${response.statusText}`)
      console.log(`API Response type: ${response.type}`)
      const contentType = response.headers.get("content-type")
      console.log(`API Response content-type: ${contentType}`)

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      // Check content type
      if (!contentType || !contentType.includes("application/json")) {
        // Try to get the response text for debugging
        const responseText = await response.text()
        console.error("API returned non-JSON response:", responseText.substring(0, 200) + "...")

        throw new Error(`API did not return JSON. Received: ${contentType || "unknown"}`)
      }

      // If we got here, we have a valid JSON response
      // Reset the response since we consumed it with text()
      const data = await fetch(apiUrl, {
        headers: { Accept: "application/json" },
      }).then((res) => res.json())

      setApiUsers(data)
    } catch (error: any) {
      console.error("Error fetching API users:", error)

      // Set specific error message based on error type
      if (error.name === "AbortError") {
        setApiError("API request timed out. Please check your connection and try again.")
      } else if (error.message.includes("<!DOCTYPE") || error.message.includes("text/html")) {
        setApiError(
          "API returned HTML instead of JSON."
        )
      } else {
        setApiError(error.message || "Failed to fetch users. Please try again later.")
      }

      // Clear users when API fails
      setApiUsers([])
    } finally {
      setApiLoading(false)
    }
  }

  // Load API users on initial render
  useEffect(() => {
    if (!loading && user) {
      fetchApiUsers()
    }
  }, [loading, user])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Create a new user
  const handleCreateUser = async () => {
    setApiLoading(true)
    setApiError(null)

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...formData,
          fechaUltimoAcceso: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      // Refresh the user list
      await fetchApiUsers()
      setIsCreateDialogOpen(false)

      // Reset form data
      setFormData({
        nombre: "",
        apellidos: "",
        cedula: "",
        correoElectronico: "",
      })
    } catch (error: any) {
      console.error("Error creating user:", error)
      setApiError(error.message || "Failed to create user")
    } finally {
      setApiLoading(false)
    }
  }

  // Actualizar la referencia a _id en la función handleUpdateUser
  const handleUpdateUser = async () => {
    if (!selectedUser) return

    setApiLoading(true)
    setApiError(null)

    try {
      const response = await fetch(`${apiUrl}/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...formData,
          fechaUltimoAcceso: selectedUser.fechaUltimoAcceso,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      // Refresh the user list
      await fetchApiUsers()
      setIsEditDialogOpen(false)
    } catch (error: any) {
      console.error("Error updating user:", error)
      setApiError(error.message || "Failed to update user")
    } finally {
      setApiLoading(false)
    }
  }

  // Actualizar las referencias a _id por id en la función handleDeleteUser
  const handleDeleteUser = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario?")) return

    setApiLoading(true)
    setApiError(null)

    try {
      const response = await fetch(`${apiUrl}/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      // Refresh the user list
      await fetchApiUsers()
    } catch (error: any) {
      console.error("Error deleting user:", error)
      setApiError(error.message || "Failed to delete user")
    } finally {
      setApiLoading(false)
    }
  }

  // Open edit dialog with user data
  const openEditDialog = (user: ApiUser) => {
    setSelectedUser(user)
    setFormData({
      nombre: user.nombre,
      apellidos: user.apellidos,
      cedula: user.cedula,
      correoElectronico: user.correoElectronico,
    })
    setIsEditDialogOpen(true)
  }

  const handleLogout = async () => {
    try {
      if (!supabase) {
        console.error("Supabase client not initialized. Check your environment variables.")
        router.push("/login")
        return
      }

      await supabase.auth.signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Dashboard</CardTitle>
              <CardDescription>Bienvenido a tu cuenta</CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">{user?.user_metadata?.full_name || userData?.fullName || user?.email}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            {userData && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Tu clasificación</h3>
                  <UserClassificationBadge classification={userData.classification} showLabel={true} size="lg" />
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Último acceso</h3>
                  <p className="text-sm">
                    {userData.previousLogin ? new Date(userData.previousLogin).toLocaleString() : "Primera visita"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Gestión de Usuarios</CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={fetchApiUsers} disabled={apiLoading}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                  </Button>
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Usuario
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                        <DialogDescription>Ingresa los datos del nuevo usuario.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre</Label>
                            <Input
                              id="nombre"
                              name="nombre"
                              value={formData.nombre}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="apellidos">Apellidos</Label>
                            <Input
                              id="apellidos"
                              name="apellidos"
                              value={formData.apellidos}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cedula">Cédula</Label>
                          <Input
                            id="cedula"
                            name="cedula"
                            value={formData.cedula}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="correoElectronico">Correo Electrónico</Label>
                          <Input
                            id="correoElectronico"
                            name="correoElectronico"
                            type="email"
                            value={formData.correoElectronico}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleCreateUser} disabled={apiLoading}>
                          {apiLoading ? "Creando..." : "Crear Usuario"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {apiError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="whitespace-pre-line">{apiError}</AlertDescription>
                </Alert>
              )}

              {apiLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : apiUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {apiError ? "No se pudieron cargar los usuarios" : "No hay usuarios registrados"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-base">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-4 px-6">Nombre</th>
                        <th className="text-left py-4 px-6">Apellidos</th>
                        <th className="text-left py-4 px-6">Cédula</th>
                        <th className="text-left py-4 px-6">Correo</th>
                        <th className="text-center py-4 px-6">Puntaje</th>
                        <th className="text-right py-4 px-6">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiUsers.map((apiUser) => {
                        const score = calculateUserScore(apiUser)
                        return (
                          <tr key={apiUser.id} className="border-b hover:bg-muted/50">
                            <td className="py-4 px-6 font-medium">{apiUser.nombre}</td>
                            <td className="py-4 px-6">{apiUser.apellidos}</td>
                            <td className="py-4 px-6">{apiUser.cedula}</td>
                            <td className="py-4 px-6">{apiUser.correoElectronico}</td>
                            <td className="py-4 px-6 text-center">
                              <span
                                className={`inline-block rounded-full px-3 py-1 text-sm font-semibold 
                                ${
                                  score >= 50
                                    ? "bg-green-100 text-green-800"
                                    : score >= 30
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {score} pts
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" size="sm" onClick={() => openEditDialog(apiUser)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDeleteUser(apiUser.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Actualiza los datos del usuario.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre</Label>
                <Input id="edit-nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-apellidos">Apellidos</Label>
                <Input
                  id="edit-apellidos"
                  name="apellidos"
                  value={formData.apellidos}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cedula">Cédula</Label>
              <Input id="edit-cedula" name="cedula" value={formData.cedula} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-correoElectronico">Correo Electrónico</Label>
              <Input
                id="edit-correoElectronico"
                name="correoElectronico"
                type="email"
                value={formData.correoElectronico}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser} disabled={apiLoading}>
              {apiLoading ? "Actualizando..." : "Actualizar Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

