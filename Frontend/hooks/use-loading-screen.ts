import { useEffect, useState, useCallback } from 'react'

interface UseLoadingScreenProps {
  minDuration?: number // duração mínima em ms (padrão 2500ms)
  onLoadingComplete?: () => void
}

interface LoadingState {
  isLoading: boolean
  progress: number
  currentStep: number
}

/**
 * Hook para gerenciar tempo mínimo de LoadingScreen
 * Garante que LoadingScreen fica visível por no mínimo X segundos
 * mesmo que dados carreguem mais rápido
 */
export function useLoadingScreen({ minDuration = 2500, onLoadingComplete }: UseLoadingScreenProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    progress: 0,
    currentStep: 0,
  })

  const [dataLoaded, setDataLoaded] = useState(false)
  const [startTime] = useState(Date.now())

  // Simular progresso visual
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setLoadingState(prev => ({
        ...prev,
        progress: prev.progress >= 90 ? prev.progress : prev.progress + Math.random() * 25
      }))
    }, 300)

    const stepInterval = setInterval(() => {
      setLoadingState(prev => ({
        ...prev,
        currentStep: prev.currentStep < 2 ? prev.currentStep + 1 : prev.currentStep
      }))
    }, 1200)

    return () => {
      clearInterval(progressInterval)
      clearInterval(stepInterval)
    }
  }, [])

  // Verificar se pode finalizar
  useEffect(() => {
    if (!dataLoaded) return

    const elapsed = Date.now() - startTime
    const remainingTime = Math.max(0, minDuration - elapsed)

    const timeout = setTimeout(() => {
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        progress: 100,
        currentStep: 2
      }))
      onLoadingComplete?.()
    }, remainingTime)

    return () => clearTimeout(timeout)
  }, [dataLoaded, startTime, minDuration, onLoadingComplete])

  const markDataAsLoaded = useCallback(() => {
    setDataLoaded(true)
  }, [])

  return {
    ...loadingState,
    markDataAsLoaded,
    dataLoaded
  }
}
