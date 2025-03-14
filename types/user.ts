export type UserClassification = "Hechicero" | "Luchador" | "Explorador" | "Olvidado" | "Nuevo"

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  created_at: string
  last_login: string
  previous_login?: string
  classification: UserClassification
  updated_at: string
}

