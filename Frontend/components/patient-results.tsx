"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, Clock, Stethoscope, User } from "lucide-react"
import { getPacienteHistoryRequest } from "@/api/requests"
import { UserDropdown } from "./user-dropdown"

type BackendStatus = "preliminar" | "realizada" | "aprovada" | "cancelada" | "agendada"
type UiStatus = "pending_processing" | "pending_validation" | "validated" | "cancelled"

type ReportData = {
  id: string
  status: UiStatus
  symptoms: string[]
  intensity?: string
  submittedDate?: string
  resultado?: string
  medico?: string
  notas?: string
}

type UserInfo = {
  id: string
  nome: string
  email: string
  tipo: "paciente" | "medico" | "admin"
}

type ConsultaDetalhes = {
  id: string
  diagnostico?: string
  diagnostico_final?: string
  resultado?: string
  notas?: string
  medico?: {
    nome?: string
    email?: string
  }
  recomendacoes_livres?: string[]
  recomendacoes_medicos?: string[]
  dataHora?: string
  status?: string
  paciente?: {
    nome?: string
  }
}

const mapStatus = (status?: BackendStatus): UiStatus => {
  if (status === "realizada" || status === "aprovada") return "validated"
  if (status === "cancelada") return "cancelled"
  // agendada | preliminar | undefined
  return "pending_validation"
}

const emptyReport: ReportData = {
  id: "",
  status: "pending_validation",
  symptoms: [],
  intensity: undefined,
  submittedDate: undefined,
}

// Função para buscar consulta para paciente
const fetchConsultaForPaciente = async (id: string, token: string): Promise<ConsultaDetalhes | null> => {
  try {
    console.log(`🔍 Buscando consulta para paciente ID: ${id}`)
    const response = await fetch(`http://localhost:8080/api/consultas/paciente/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
    
    console.log(`📊 Resposta: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const result = await response.json()
      console.log("✅ Resposta completa da API:", result)
      
      if (result.success && result.data) {
        console.log("📋 Dados da consulta:", result.data)
        console.log("🔍 Campos disponíveis:", Object.keys(result.data))
        
        // Log específico para diagnóstico
        console.log("🔎 Buscando diagnóstico em:", {
          diagnostico: result.data.diagnostico,
          diagnostico_final: result.data.diagnostico_final,
          resultado: result.data.resultado,
          notas: result.data.notas,
          recomendacoes_livres: result.data.recomendacoes_livres,
          recomendacoes_medicos: result.data.recomendacoes_medicos
        })
        
        return result.data
      }
    } else {
      const errorText = await response.text()
      console.warn(`⚠️ Erro ${response.status}:`, errorText)
    }
    return null
  } catch (error) {
    console.warn("⚠️ Erro ao buscar consulta:", error)
    return null
  }
}

export function PatientResults() {
  const router = useRouter()
  const [reportData, setReportData] = useState<ReportData>(emptyReport)
  const [consultaDetalhes, setConsultaDetalhes] = useState<ConsultaDetalhes | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  useEffect(() => {
    const fetchLatestReport = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
        const userRaw = typeof window !== "undefined" ? localStorage.getItem("user") : null
        const user = userRaw ? JSON.parse(userRaw) : null
        
        if (user) {
          setUserInfo(user)
        }

        if (!token || !user?.id) {
          setError("Sessão expirada. Faça login novamente.")
          setLoading(false)
          return
        }

        console.log("🔄 Buscando histórico do paciente...")
        const response = await getPacienteHistoryRequest(token, user.id)
        
        if (!response.ok) {
          console.error(`❌ Erro na resposta do histórico: ${response.status} ${response.statusText}`)
          if (response.status === 404) {
            setReportData(emptyReport)
            setLoading(false)
            return
          }
          const errorData = await response.json().catch(() => ({ message: "Erro desconhecido" }))
          setError(errorData.message || "Não foi possível obter os resultados.")
          setLoading(false)
          return
        }

        const { data, message } = await response.json()
        console.log("📊 Dados do histórico recebidos:", data)

        const latest = Array.isArray(data) ? data[0] : null

        if (!latest) {
          console.log("📭 Nenhum histórico encontrado")
          setReportData(emptyReport)
          setLoading(false)
          return
        }

        console.log("📝 Última consulta encontrada:", latest)

        const normalizedReport: ReportData = {
          id: latest.id,
          status: mapStatus(latest.status as BackendStatus),
          symptoms: Array.isArray(latest.symptoms) ? latest.symptoms : [latest.symptoms || "Sem sintomas"],
          intensity: latest.intensity,
          submittedDate: latest.date,
          resultado: latest.resultado,
          medico: latest.medico,
          notas: latest.notas,
        }

        console.log("✅ Relatório normalizado:", normalizedReport)
        setReportData(normalizedReport)

        // Se a consulta foi validada, buscar detalhes adicionais
        if (normalizedReport.status === "validated" && normalizedReport.id) {
          console.log(`🔍 Consulta validada encontrada, buscando detalhes...`)
          const detalhes = await fetchConsultaForPaciente(normalizedReport.id, token)
          
          if (detalhes) {
            console.log("📋 Detalhes da consulta recebidos:", detalhes)
            setConsultaDetalhes(detalhes)
          }
        }
      } catch (err) {
        console.error("❌ Erro geral ao carregar resultados:", err)
        setError("Erro ao carregar resultados. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }

    fetchLatestReport()
  }, [])

  // Determinar texto do diagnóstico - BUSCA EM VÁRIOS CAMPOS
  const diagnosticoText = useMemo(() => {
    console.log("🔍 Analisando dados para diagnóstico...")

    // 1. Primeiro procurar em recomendacoes_livres por "Diagnóstico confirmado:"
    if (consultaDetalhes?.recomendacoes_livres && Array.isArray(consultaDetalhes.recomendacoes_livres)) {
      for (const item of consultaDetalhes.recomendacoes_livres) {
        if (typeof item === 'string') {
          // Verificar se contém "Diagnóstico confirmado:"
          if (item.toLowerCase().includes('diagnóstico confirmado') || 
              item.toLowerCase().includes('diagnostico confirmado')) {
            console.log("✅ Diagnóstico encontrado em recomendacoes_livres:", item)
            // Extrair apenas a parte após "Diagnóstico confirmado:"
            const match = item.match(/[Dd]iagn[oó]stico confirmado:?\s*(.+)/i)
            if (match && match[1]) {
              return match[1].trim()
            }
            return item.trim()
          }
          // Verificar se parece um diagnóstico (texto significativo)
          if (item.trim().length > 20 && !item.includes('recomendação') && !item.includes('recomendacao')) {
            console.log("✅ Texto longo encontrado em recomendacoes_livres (possível diagnóstico):", item)
            return item.trim()
          }
        }
      }
    }

    // 2. Verificar campos específicos do endpoint
    if (consultaDetalhes) {
      const camposParaVerificar = [
        consultaDetalhes.diagnostico_final,
        consultaDetalhes.diagnostico,
        consultaDetalhes.resultado,
        consultaDetalhes.notas,
      ]

      for (const campo of camposParaVerificar) {
        if (campo && typeof campo === 'string' && campo.trim()) {
          console.log("✅ Diagnóstico encontrado em campo específico:", campo)
          return campo.trim()
        }
      }
    }

    // 3. Verificar histórico básico
    if (reportData.resultado && reportData.resultado.trim()) {
      console.log("✅ Usando resultado do histórico:", reportData.resultado)
      return reportData.resultado.trim()
    }
    
    if (reportData.notas && reportData.notas.trim()) {
      console.log("✅ Usando notas do histórico:", reportData.notas)
      return reportData.notas.trim()
    }

    console.log("❌ Nenhum diagnóstico encontrado em nenhum campo")
    return "Diagnóstico em elaboração - o médico validou a consulta e está finalizando o relatório"
  }, [consultaDetalhes, reportData.resultado, reportData.notas])

  // Determinar nome do médico
  const medicoNome = useMemo(() => {
    console.log("🔍 Analisando dados do médico...")

    // 1. Do endpoint detalhado
    if (consultaDetalhes?.medico) {
      if (typeof consultaDetalhes.medico === 'string') {
        console.log("✅ Médico como string:", consultaDetalhes.medico)
        return consultaDetalhes.medico
      } else if (consultaDetalhes.medico.nome) {
        console.log("✅ Médico como objeto:", consultaDetalhes.medico.nome)
        return consultaDetalhes.medico.nome
      }
    }

    // 2. Dos dados do histórico
    if (reportData.medico && reportData.medico.trim()) {
      console.log("✅ Médico do histórico:", reportData.medico)
      return reportData.medico.trim()
    }

    console.log("❌ Nome do médico não encontrado")
    return "Médico Responsável"
  }, [consultaDetalhes, reportData.medico])

  // Data da validação
  const dataValidacao = useMemo(() => {
    if (consultaDetalhes?.dataHora) {
      return new Date(consultaDetalhes.dataHora).toLocaleDateString("pt-PT", {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    if (reportData.submittedDate) {
      return new Date(reportData.submittedDate).toLocaleDateString("pt-PT", {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    }
    return "Data não disponível"
  }, [consultaDetalhes, reportData.submittedDate])

  // Verificar se temos diagnóstico válido
  const hasDiagnosticoValido = useMemo(() => {
    const texto = diagnosticoText.toLowerCase()
    return !texto.includes("diagnóstico em elaboração") && 
           !texto.includes("aguardando") &&
           texto.trim().length > 10
  }, [diagnosticoText])

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Carregando resultados...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto p-4 md:p-6">
        <Alert className="mb-6" variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/login")}>Voltar ao login</Button>
      </div>
    )
  }

  const hasData = !!reportData.id
  const isValidated = reportData.status === "validated"

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 flex flex-col space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-7 w-7 text-primary" />
          <span className="text-xl font-semibold ml-2">Medical Assistant</span>
        </div>
        {userInfo && (
          <UserDropdown
            nome={userInfo.nome}
            email={userInfo.email}
            tipo={userInfo.tipo}
          />
        )}
      </div>

      {/* Alert de Status */}
      {isValidated ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">Relatório Validado</AlertTitle>
          <AlertDescription className="text-green-800">
            {hasDiagnosticoValido 
              ? "O seu relatório foi validado por um médico. Veja o diagnóstico abaixo."
              : "O médico validou sua consulta. O diagnóstico detalhado está sendo finalizado."}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Análise em Progresso</AlertTitle>
          <AlertDescription className="text-blue-800">
            O seu relatório está a ser processado e aguarda validação médica. Receberá uma notificação quando estiver pronto.
          </AlertDescription>
        </Alert>
      )}

      {/* Card com Sintomas Reportados */}
      <Card className="border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Sintomas Reportados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-5">
          <div>
            <p className="text-sm text-muted-foreground">Sintomas</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {(hasData ? reportData.symptoms : ["Nenhum sintoma encontrado"]).map((symptom) => (
                <Badge key={symptom} variant="secondary">
                  {symptom}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Data de Submissão</p>
            <p className="font-medium mt-1">
              {reportData.submittedDate
                ? new Date(reportData.submittedDate).toLocaleDateString("pt-PT", {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : "Sem registo"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Seção de Diagnóstico Validado - APENAS se validado */}
      {isValidated ? (
        <Card className="rounded-xl shadow-sm border-green-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Diagnóstico */}
            <div className="space-y-3">
             
              
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                {hasDiagnosticoValido ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <p className="font-medium text-green-800">Diagnóstico</p>
                    </div>
                    <div className="pl-7">
                      <p className="text-base text-gray-800 leading-relaxed">{diagnosticoText}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-700">Diagnóstico em Finalização</p>
                      <p className="text-sm text-gray-600 mt-1">
                        O médico validou sua consulta e está finalizando o diagnóstico detalhado.
                        {diagnosticoText !== "Diagnóstico em elaboração - o médico validou a consulta e está finalizando o relatório" && (
                          <>
                            <br />
                            <span className="text-gray-700 mt-1 inline-block">{diagnosticoText}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Médico e Data de Validação */}
           
           
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-muted-foreground mb-1">Data da Validação</p>
                  <p className="font-medium text-blue-800">{dataValidacao}</p>
                </div>
              
          

            {/* Status do Relatório */}
            <div className="p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Estado do Relatório</p>
                  <p className="font-medium">
                    {hasDiagnosticoValido ? "Validado com Diagnóstico" : "Validado - Diagnóstico em Finalização"}
                  </p>
                </div>
                <Badge className={`${hasDiagnosticoValido ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'}`}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {hasDiagnosticoValido ? "Completado" : "Em Finalização"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Card de Aguardando Validação */
        <Card className="rounded-xl shadow-sm border-blue-100 opacity-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Clock className="h-5 w-5" />
              Aguardando Validação
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-muted-foreground mb-2">
              O diagnóstico aparecerá aqui após a validação médica.
            </p>
            <p className="text-sm text-muted-foreground">
              O seu relatório está sendo analisado por um profissional de saúde.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Card de Próximos Passos */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Próximos Passos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent hover:bg-gray-50"
            onClick={() => router.push("/patient/")}
          >
            Agendar Consulta Médica
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent hover:bg-gray-50"
            onClick={() => router.push("/patient/history")}
          >
            Ver Histórico Completo
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent hover:bg-gray-50"
            onClick={() => router.push("/patient/symptoms")}
          >
            Registar Novos Sintomas
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
