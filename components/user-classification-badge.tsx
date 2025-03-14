import { Badge } from "@/components/ui/badge"
import type { UserClassification } from "@/types/user"

interface UserClassificationBadgeProps {
  classification: UserClassification
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
}

export default function UserClassificationBadge({
  classification,
  showLabel = true,
  size = "md",
}: UserClassificationBadgeProps) {
  // Get badge color based on classification
  const getBadgeClass = () => {
    switch (classification) {
      case "Hechicero":
        return "bg-purple-500 hover:bg-purple-600"
      case "Luchador":
        return "bg-red-500 hover:bg-red-600"
      case "Explorador":
        return "bg-green-500 hover:bg-green-600"
      case "Olvidado":
        return "bg-gray-500 hover:bg-gray-600"
      case "Nuevo":
        return "bg-blue-500 hover:bg-blue-600"
      default:
        return ""
    }
  }

  // Get size class
  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return "text-xs px-2 py-0.5"
      case "lg":
        return "text-base px-3 py-1"
      default:
        return "text-sm px-2.5 py-0.5"
    }
  }

  // Get description based on classification
  const getDescription = () => {
    switch (classification) {
      case "Hechicero":
        return "Último acceso en las últimas 12 horas"
      case "Luchador":
        return "Último acceso entre 12 y 48 horas"
      case "Explorador":
        return "Último acceso entre 2 y 7 días"
      case "Olvidado":
        return "Último acceso hace más de 7 días"
      case "Nuevo":
        return "Primera vez en la aplicación"
      default:
        return ""
    }
  }

  return (
    <div className="inline-flex flex-col">
      <Badge className={`${getBadgeClass()} ${getSizeClass()}`}>{classification}</Badge>
      {showLabel && <span className="text-xs text-muted-foreground mt-1">{getDescription()}</span>}
    </div>
  )
}

