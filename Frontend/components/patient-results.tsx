"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeft, CheckCircle2, FileText, Clock, Stethoscope } from "lucide-react"
import { getPacienteHistoryRequest, getConsultaRequest } from "@/api/requests"
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
  recomendacoes?: string[]
}

type UserInfo = {
  id: string
  nome: string
  email: string
  tipo: "paciente" | "medico" | "admin"
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

export function PatientResults() {
  const router = useRouter()
  const [reportData, setReportData] = useState<ReportData>(emptyReport)
  const [resultadoValidado, setResultadoValidado] = useState<string | null>(null)
  const [recomendacoes, setRecomendacoes] = useState<string[]>([])
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
          return
        }

        // NÃO mostrar diagnósticos do localStorage - apenas após validação médica
        // Os diagnósticos só aparecem para o paciente após validação

        const response = await getPacienteHistoryRequest(token, user.id)
        const { data, message } = await response.json()

        if (!response.ok) {
          if (response.status === 404) {
            // Sem histórico para este paciente: manter UI vazia sem erro fatal
            setReportData(emptyReport)
            return
          }
          setError(message || "Não foi possível obter os resultados.")
          return
        }

        const latest = Array.isArray(data) ? data[0] : null

        if (!latest) {
          setReportData(emptyReport)
          return
        }

        const normalizedReport: ReportData = {
          id: latest.id,
          status: mapStatus(latest.status as BackendStatus),
          symptoms: Array.isArray(latest.symptoms) ? latest.symptoms : [latest.symptoms || "Sem sintomas"],
          intensity: latest.intensity,
          submittedDate: latest.date,
          resultado: latest.resultado,
          recomendacoes: latest.recomendacoes,
        }

        setReportData(normalizedReport)

        // Só buscar diagnósticos se a consulta foi validada
        if (normalizedReport.status === "validated" && normalizedReport.id) {
          try {
            const consultaResp = await getConsultaRequest(normalizedReport.id, token)
            const { data: consultaData } = await consultaResp.json()
            if (consultaResp.ok && consultaData) {
              const resultText =
                typeof consultaData.resultado === "string"
                  ? consultaData.resultado
                  : consultaData.resultado?.diagnostico ||
                    consultaData.resultado?.texto ||
                    null
              setResultadoValidado(resultText)

              const recs =
                consultaData.recomendacoes_livres ||
                (Array.isArray(consultaData.recomendacoes_medicos)
                  ? consultaData.recomendacoes_medicos
                  : [])

              setRecomendacoes(recs?.filter(Boolean) ?? [])
              
              // Buscar diagnósticos apenas se a consulta foi validada
              // Os diagnósticos podem estar no resultado ou precisam ser recalculados
              // Por enquanto, o diagnóstico validado vem no resultado
            }
          } catch (fetchErr) {
            console.error("Erro ao obter detalhes da consulta validada:", fetchErr)
          }
        }
      } catch (err) {
        console.error("Erro ao carregar resultados do paciente:", err)
        setError("Erro ao carregar resultados. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }

    fetchLatestReport()
  }, [])

  const isPending = useMemo(
    () => reportData.status === "pending_processing" || reportData.status === "pending_validation",
    [reportData.status]
  )

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-4 md:p-6">
        <p className="text-muted-foreground text-center">Carregando resultados...</p>
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




      {reportData.status === "validated" ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">Relatório Validado</AlertTitle>
          <AlertDescription className="text-green-800">
            {resultadoValidado || reportData.resultado
              ? `Resultado: ${resultadoValidado || reportData.resultado}`
              : "O relatório foi validado. Abra abaixo para ver detalhes e recomendações."}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Análise em Progresso</AlertTitle>
          <AlertDescription className="text-blue-800">
            O seu relatório está a ser processado e aguarda validação médica. Receberá uma notificação quando estiver
            pronto.
          </AlertDescription>
        </Alert>
      )}

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
          {reportData.intensity && (
            <div>
              <p className="text-sm text-muted-foreground">Intensidade</p>
              <p className="font-medium mt-1">{reportData.intensity}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Data de Submissão</p>
            <p className="font-medium mt-1">
              {reportData.submittedDate
                ? new Date(reportData.submittedDate).toLocaleDateString("pt-PT")
                : "Sem registo"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Mostrar diagnósticos APENAS se a consulta foi validada pelo médico */}
      {reportData.status === "validated" && resultadoValidado && (
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle>Diagnóstico Validado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg bg-green-50/50">
              <p className="font-semibold text-lg mb-2">Resultado da Análise Médica</p>
              <p className="text-base">{resultadoValidado}</p>
            </div>
            {recomendacoes.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Recomendações Médicas:</p>
                <ul className="space-y-2">
                  {recomendacoes.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {reportData.status !== "validated" && (
        <Card className="opacity-50 rounded-xl shadow-sm">
          <CardContent className="p-6 text-center space-y-3">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              O diagnóstico e recomendações aparecerão aqui após a validação médica.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              O seu relatório está sendo analisado por um profissional de saúde.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Próximos Passos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent"
            onClick={() => router.push("/patient/")}
          >
            Agendar Consulta Médica
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent"
            onClick={() => router.push("/patient/history")}
          >
            Ver Histórico Completo
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent"
            onClick={() => router.push("/patient/symptoms")}
          >
            Registar Novos Sintomas
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
