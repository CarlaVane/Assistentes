"use client"

import { useEffect, useState } from "react"
import { Stethoscope } from "lucide-react"

interface LoadingScreenProps {
  userType: "patient" | "doctor" | "admin"
  onLoadComplete?: () => void
  minDuration?: number // tempo mínimo em ms (padrão 5000)
}

export function LoadingScreen({ userType, onLoadComplete, minDuration = 5000 }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  const steps = ["Validando credenciais...", "Carregando dados do perfil...", "Inicializando sistema..."]

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 30
      })
    }, 400)
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev))
    }, 1200)

    // Finaliza o carregamento após minDuration
    const completeTimeout = setTimeout(() => {
      setProgress(100)
      setCurrentStep(steps.length - 1)
      setTimeout(() => {
        onLoadComplete?.()
      }, 600)
    }, minDuration)

    return () => {
      clearInterval(progressInterval)
      clearInterval(stepInterval)
      clearTimeout(completeTimeout)
    }
  }, [minDuration, onLoadComplete])

  const getUserTypeLabel = () => {
    switch (userType) {
      case "patient":
        return "Utente"
      case "doctor":
        return "Médico"
      case "admin":
        return "Administrador"
      default:
        return "Utilizador"
    }
  }

  return (
    <div className="fixed inset-0 bg-linear-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center z-50">
      <div className="flex flex-col items-center justify-center space-y-8 max-w-md w-full px-4">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-blue-600/10 flex items-center justify-center animate-pulse">
            <Stethoscope className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900">Bem-vindo, {getUserTypeLabel()}</h2>
        </div>

        {/* Status message */}
        <div className="h-6 flex items-center">
          <p className="text-sm text-gray-600 transition-all duration-300">{steps[currentStep]}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-2">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center">{Math.round(progress)}%</p>
        </div>

        {/* Loading dots */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    </div>
  )
}
