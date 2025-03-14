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

interface ApiUser {
  id: string
  nombre: string
  apellidos: string
  cedula: string
  correoElectronico: string
  fechaUltimoAcceso: string
  clasificacion?: string
}

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

  const calculateUserScore = (user: ApiUser): number => {
    let score = 0

    const fullName = `${user.nombre} ${user.apellidos}`.trim()
    const nameLength = fullName.length

    if (nameLength > 10) {
      score += 20
    } else if (nameLength >= 5) {
      score += 10
    }

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

  useEffect(() => {
    const fetchUserData = async () => {
      try {
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

    let subscription: { unsubscribe: () => void } = { unsubscribe: () => {} }

    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          setUser(session.user)

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

  const fetchApiUsers = async () => {
    setApiLoading(true)
    setApiError(null)

    try {
      console.log(`Attempting to fetch from API URL: ${apiUrl}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      let response
      try {
        response = await fetch(apiUrl, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
          mode: "cors",
        })
      } catch (initialError) {
        console.log("Initial fetch failed, trying with no-cors mode:", initialError)
        response = await fetch(apiUrl, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
          mode: "no-cors",
        })
      }

      clearTimeout(timeoutId)

      console.log(`API Response status: ${response.status} ${response.statusText}`)
      console.log(`API Response type: ${response.type}`)
      const contentType = response.headers.get("content-type")
      console.log(`API Response content-type: ${contentType}`)

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text()
        console.error("API returned non-JSON response:", responseText.substring(0, 200) + "...")

        throw new Error(`API did not return JSON. Received: ${contentType || "unknown"}`)
      }

      const data = await fetch(apiUrl, {
        headers: { Accept: "application/json" },
      }).then((res) => res.json())

      setApiUsers(data)
    } catch (error: any) {
      console.error("Error fetching API users:", error)

      if (error.name === "AbortError") {
        setApiError("API request timed out. Please check your connection and try again.")
      } else if (error.message.includes("<!DOCTYPE") || error.message.includes("text/html")) {
        setApiError(
          "API returned HTML instead of JSON."
        )
      } else {
        setApiError(error.message || "Failed to fetch users. Please try again later.")
      }

      setApiUsers([])
    } finally {
      setApiLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && user) {
      fetchApiUsers()
    }
  }, [loading, user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

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

      await fetchApiUsers()
      setIsCreateDialogOpen(false)

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

      await fetchApiUsers()
      setIsEditDialogOpen(false)
    } catch (error: any) {
      console.error("Error updating user:", error)
      setApiError(error.message || "Failed to update user")
    } finally {
      setApiLoading(false)
    }
  }

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

      await fetchApiUsers()
    } catch (error: any) {
      console.error("Error deleting user:", error)
      setApiError(error.message || "Failed to delete user")
    } finally {
      setApiLoading(false)
    }
  }

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
                  {apiError ? "No se pudieron cargar los usuarios." : "No hay usuarios registrados."}
                </div>
              ) : (
                <div className="space-y-4">
                  {apiUsers.map((apiUser) => {
                    const score = calculateUserScore(apiUser)
                    let classification: UserClassification = "Olvidado"

                    if (score >= 60) {
                      classification = "Hechicero"
                    } else if (score >= 40) {
                      classification = "Luchador"
                    } else if (score >= 30) {
                      classification = "Explorador"
                    }

                    return (
                      <div key={apiUser.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">
                                {apiUser.nombre} {apiUser.apellidos}
                              </h3>
                              <UserClassificationBadge classification={classification} />
                            </div>
                            <p className="text-sm text-muted-foreground">{apiUser.correoElectronico}</p>
                            <p className="text-xs text-muted-foreground">Cédula: {apiUser.cedula}</p>
                            <p className="text-xs text-muted-foreground">
                              Último acceso:{" "}
                              {apiUser.fechaUltimoAcceso
                                ? new Date(apiUser.fechaUltimoAcceso).toLocaleString()
                                : "Nunca"}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(apiUser)}
                              title="Editar usuario"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteUser(apiUser.id)}
                              title="Eliminar usuario"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Modifica los datos del usuario.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre</Label>
                <Input
                  id="edit-nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  required
                />
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
              {apiLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
