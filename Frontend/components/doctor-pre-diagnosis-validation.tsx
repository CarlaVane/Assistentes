"use client"; 

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Clock, FileText, Heart, User, LogOut, Loader2, CheckCircle2, AlertCircle, Stethoscope } from "lucide-react";
import { getPendingConsultasRequest, approveConsultaRequest } from "@/api/requests/consultas";
import { getDoencaRequest } from "@/api/requests/doenca";
import { getSintomaRequest } from "@/api/requests/sintomas";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserDropdown } from "@/components/user-dropdown";
import { validateDiagnosisRequest, type DiagnosisValidationData } from "@/api/requests/validationRequests";

// Tipagens das estruturas de dados
interface Diagnostico {
  _id: string;
  doenca: string;
  porcentagem: number;
  sintomasDoenca: string[];
  sintomasConsulta: string[];
  sintomasComuns: string[];
  sintomasFaltantes: string[];
}

interface PreDiagnosis {
  id: string;
  patientName: string;
  patientBI: string;
  symptoms: string[];
  symptomIds?: string[]; // IDs dos sintomas
  descricao?: string;
  submittedDate: string;
  status: string;
  diagnosticos: Diagnostico[];
  doencaSugerida?: {
    nome: string;
    descricao?: string;
  } | null;
}

interface Recomendacao {
  _id: string;
  nome: string;
  descricao?: string;
  origem?: 'sintoma' | 'doenca'; // De onde veio a recomendação
  sintomaId?: string; // Se veio de sintoma, qual sintoma
}

export function DoctorPreDiagnosisValidation(): JSX.Element {
  const router = useRouter();
  const [pendingPreDiagnoses, setPendingPreDiagnoses] = useState<PreDiagnosis[]>([]);
  const [selectedReport, setSelectedReport] = useState<PreDiagnosis | null>(null);
  const [validationNotes, setValidationNotes] = useState<string>("");
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para seleção de doença e recomendações
  const [selectedDoencaId, setSelectedDoencaId] = useState<string | null>(null);
  const [availableRecomendacoes, setAvailableRecomendacoes] = useState<Recomendacao[]>([]);
  const [selectedRecomendacoes, setSelectedRecomendacoes] = useState<string[]>([]);
  const [loadingRecomendacoes, setLoadingRecomendacoes] = useState(false);
  const [userInfo, setUserInfo] = useState<{ nome: string; email: string; tipo: "admin" | "medico" | "paciente" }>({
    nome: "",
    email: "",
    tipo: "medico",
  });

  useEffect(() => {
    const fetchPendingConsultas = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const response = await getPendingConsultasRequest(token);
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (!response.ok) {
          throw new Error("Erro ao carregar consultas pendentes");
        }

        const result = await response.json();
        const consultas = result.data || [];
        setPendingPreDiagnoses(consultas);

        if (consultas.length > 0 && !selectedReport) {
          setSelectedReport(consultas[0]);
        }
      } catch (err: any) {
        setError(err.message || "Erro ao carregar consultas");
      } finally {
        setLoading(false);
      }
    };

    fetchPendingConsultas();
  }, [router]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      if (raw) {
        const u = JSON.parse(raw);
        setUserInfo({
          nome: u.nome || "",
          email: u.email || "",
          tipo: (u.tipo as "admin" | "medico" | "paciente") || "medico",
        });
      }
    } catch { }
  }, []);

  // Buscar recomendações quando doença for selecionada ou relatório mudar
  useEffect(() => {
    const fetchRecomendacoes = async () => {
      if (!selectedReport || !selectedDoencaId) {
        setAvailableRecomendacoes([]);
        setSelectedRecomendacoes([]);
        return;
      }

      setLoadingRecomendacoes(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const allRecomendacoes: Recomendacao[] = [];

        // 1. Buscar recomendações da doença selecionada
        const doencaResponse = await getDoencaRequest(selectedDoencaId);
        if (doencaResponse.ok) {
          const doencaData = await doencaResponse.json();
          if (doencaData.data?.recomendacoes) {
            doencaData.data.recomendacoes.forEach((rec: any) => {
              allRecomendacoes.push({
                _id: rec._id,
                nome: rec.nome || rec.descricao || 'Recomendação',
                descricao: rec.descricao,
                origem: 'doenca'
              });
            });
          }
        }

        // 2. Buscar recomendações de cada sintoma
        if (selectedReport.symptomIds && selectedReport.symptomIds.length > 0) {
          const sintomaPromises = selectedReport.symptomIds.map(async (sintomaId) => {
            try {
              const sintomaResponse = await getSintomaRequest(sintomaId);
              if (sintomaResponse.ok) {
                const sintomaData = await sintomaResponse.json();
                if (sintomaData.data?.recomendacoes) {
                  sintomaData.data.recomendacoes.forEach((rec: any) => {
                    // Evitar duplicados
                    if (!allRecomendacoes.find(r => r._id === rec._id)) {
                      allRecomendacoes.push({
                        _id: rec._id,
                        nome: rec.nome || rec.descricao || 'Recomendação',
                        descricao: rec.descricao,
                        origem: 'sintoma',
                        sintomaId: sintomaId
                      });
                    }
                  });
                }
              }
            } catch (err) {
              console.error(`Erro ao buscar recomendações do sintoma ${sintomaId}:`, err);
            }
          });

          await Promise.all(sintomaPromises);
        }

        setAvailableRecomendacoes(allRecomendacoes);
      } catch (err) {
        console.error("Erro ao buscar recomendações:", err);
      } finally {
        setLoadingRecomendacoes(false);
      }
    };

    fetchRecomendacoes();
  }, [selectedReport, selectedDoencaId]);

  // Resetar seleções quando mudar de relatório
  useEffect(() => {
    if (selectedReport) {
      setSelectedDoencaId(null);
      setSelectedRecomendacoes([]);
      setValidationNotes("");
    }
  }, [selectedReport?.id]);

  const handleValidate = async (): Promise<void> => {
    if (!selectedReport || !selectedDoencaId) {
      alert("Por favor, selecione uma doença dos diagnósticos possíveis.");
      return;
    }

    setIsValidating(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      // Na função handleValidate, no início:
console.log("🔍 selectedDoencaId:", selectedDoencaId);
console.log("🔍 Tipo:", typeof selectedDoencaId);
console.log("🔍 Diagnosticos disponíveis:", selectedReport?.diagnosticos);

      // Buscar nome da doença para enriquecer o diagnóstico
      let doencaNome = "";
      if (selectedReport.diagnosticos) {
        const diagnostico = selectedReport.diagnosticos.find(
          d => d._id === selectedDoencaId || d.doenca.toLowerCase().includes(selectedDoencaId.toLowerCase())
        );
        if (diagnostico) {
          doencaNome = diagnostico.doenca;
        }
      }

      // Preparar dados para validação no formato correto
      const validationData: DiagnosisValidationData = {
        doenca: selectedDoencaId, // Campo OBRIGATÓRIO
        
        // Campos OPCIONAIS:
        recomendacoes_medicos: selectedRecomendacoes.length > 0 
          ? selectedRecomendacoes 
          : undefined,
        
        notas: validationNotes.trim() || undefined,
        
        diagnostico_final: doencaNome 
          ? `Diagnóstico confirmado: ${doencaNome}. ${validationNotes.trim() ? `Observações: ${validationNotes.trim()}` : ''}`
          : undefined,
        
        recomendacoes_livres: validationNotes.trim() 
          ? [`Observações do médico: ${validationNotes.trim()}`] 
          : undefined,

        confiancaDiagnostico: 'alta' // Padrão alta, pode ser ajustado
      };

      console.log("🔄 Enviando para validação:", validationData);

      // Usar o endpoint específico de validação
      const response = await validateDiagnosisRequest(
        selectedReport.id, 
        token, 
        validationData
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Erro na resposta:", errorText);
        
        let errorMessage = "Erro ao validar diagnóstico";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Se não for JSON, usar o texto puro
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ Diagnóstico validado:", result);

      // Remover da lista e selecionar próxima
      const updated = pendingPreDiagnoses.filter(p => p.id !== selectedReport.id);
      setPendingPreDiagnoses(updated);
      setSelectedReport(updated.length > 0 ? updated[0] : null);
      setValidationNotes("");
      setSelectedDoencaId(null);
      setSelectedRecomendacoes([]);

      alert(result.message || "Diagnóstico validado com sucesso!");
      
      // Opcional: redirecionar se não houver mais pendentes
      if (updated.length === 0) {
        router.push("/doctor/dashboard");
      }

    } catch (err: any) {
      console.error("❌ Erro na validação:", err);
      alert(`Erro ao validar: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleLogout = (): void => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-semibold">Medical Assistant</h1>
          </div>
          <UserDropdown
            nome={userInfo.nome}
            email={userInfo.email}
            tipo={userInfo.tipo}
          />
        </div>

        {/* Badge Alert */}
        {loading ? (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <AlertTitle className="text-blue-900">Carregando...</AlertTitle>
            <AlertDescription className="text-blue-800">
              Carregando consultas pendentes...
            </AlertDescription>
          </Alert>
        ) : error ? (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTitle className="text-red-900">Erro</AlertTitle>
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900">Pré-Diagnósticos Pendentes</AlertTitle>
            <AlertDescription className="text-amber-800">
              Você tem {pendingPreDiagnoses.length} pré-diagnóstico(s) aguardando validação.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de relatórios */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-linear-to-r border-b">
                <CardTitle className="text-lg">Para Validar</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                {loading ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
                  </div>
                ) : pendingPreDiagnoses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma consulta pendente
                  </p>
                ) : (
                  pendingPreDiagnoses.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition ${selectedReport?.id === report.id
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{report.patientName}</p>
                          <p className="text-xs text-muted-foreground">BI: {report.patientBI}</p>
                        </div>
                        <Badge className="shrink-0" variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Painel de Detalhes */}
          <div className="lg:col-span-2">
            {!selectedReport ? (
              <Card className="shadow-lg border-0">
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    Selecione uma consulta da lista para ver os detalhes
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="conditions">Condições</TabsTrigger>
                  <TabsTrigger value="validate">Validar</TabsTrigger>
                </TabsList>

                {/* Aba Visão Geral */}
                <TabsContent value="overview" className="space-y-4">
                  <Card className="shadow-lg border-0">
                    <CardHeader className="bg-linear-to-r border-b">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        {selectedReport.patientName}
                      </CardTitle>
                      <CardDescription>BI: {selectedReport.patientBI}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Sintomas</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedReport.symptoms && selectedReport.symptoms.length > 0 ? (
                              selectedReport.symptoms.map((symptom, idx) => (
                                <Badge key={idx} variant="secondary">
                                  {symptom}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">Nenhum sintoma registrado</span>
                            )}
                          </div>
                        </div>
                        {selectedReport.descricao && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Descrição do Paciente</p>
                            <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedReport.descricao}</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Data de Submissão</p>
                        <p className="font-medium mt-1">{selectedReport.submittedDate}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Aba Condições */}
                <TabsContent value="conditions" className="space-y-4">
                  <Card className="shadow-lg border-0">
                    <CardHeader className="bg-linear-to-r border-b">
                      <CardTitle className="text-lg">Selecionar Diagnóstico</CardTitle>
                      <CardDescription>
                        Selecione a doença que melhor corresponde ao caso do paciente
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-3">
                      {selectedReport.diagnosticos && selectedReport.diagnosticos.length > 0 ? (
                        <RadioGroup
                          value={selectedDoencaId || ""}
                          onValueChange={setSelectedDoencaId}
                        >
                          {selectedReport.diagnosticos.map((diagnostico, idx) => {
                            const optionValue = diagnostico._id || `idx-${idx}`;
                            const radioId = `doenca-${optionValue}`;
                            const isSelected = selectedDoencaId === optionValue;
                            return (
                              <div
                                key={diagnostico._id || idx}
                                className={`flex items-start justify-between p-4 border-2 rounded-lg cursor-pointer transition ${isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-gray-200 hover:border-primary/50"
                                  }`}
                              >
                                <div className="flex items-start gap-3 flex-1">
                                  <RadioGroupItem
                                    value={optionValue}
                                    id={radioId}
                                    className="mt-1"
                                  />
                                  <label
                                    htmlFor={radioId}
                                    className="flex-1 cursor-pointer"
                                  >
                                    <h3 className="font-semibold">{diagnostico.doenca}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Compatibilidade: {diagnostico.porcentagem.toFixed(1)}%
                                    </p>
                                    {diagnostico.sintomasComuns && diagnostico.sintomasComuns.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-xs text-muted-foreground mb-1">Sintomas correspondentes:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {diagnostico.sintomasComuns.slice(0, 5).map((sintoma, i) => (
                                            <Badge key={i} variant="outline" className="text-xs">
                                              {sintoma}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </label>
                                </div>
                                <Badge
                                  variant={idx === 0 ? "default" : "secondary"}
                                  className="ml-4"
                                >
                                  {diagnostico.porcentagem.toFixed(0)}%
                                </Badge>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum diagnóstico encontrado
                        </p>
                      )}
                      {selectedDoencaId && (
                        <Alert className="border-green-200 bg-green-50 mt-4">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            Doença selecionada. As recomendações serão carregadas na aba "Validar".
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Aba Validar */}
                <TabsContent value="validate" className="space-y-4">
                  {!selectedDoencaId ? (
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertTitle className="text-amber-900">Selecione uma Doença</AlertTitle>
                      <AlertDescription className="text-amber-800">
                        Por favor, selecione uma doença na aba "Condições" antes de validar o diagnóstico.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <Card className="shadow-lg border-0">
                        <CardHeader className="bg-linear-to-r border-b">
                          <CardTitle className="text-lg">Recomendações Disponíveis</CardTitle>
                          <CardDescription>
                            Selecione as recomendações que deseja emitir para o paciente
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                          {loadingRecomendacoes ? (
                            <div className="text-center py-8">
                              <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
                              <p className="text-sm text-muted-foreground mt-2">Carregando recomendações...</p>
                            </div>
                          ) : availableRecomendacoes.length > 0 ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {availableRecomendacoes.map((recomendacao) => (
                                <div
                                  key={recomendacao._id}
                                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50"
                                >
                                  <Checkbox
                                    checked={selectedRecomendacoes.includes(recomendacao._id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedRecomendacoes([...selectedRecomendacoes, recomendacao._id]);
                                      } else {
                                        setSelectedRecomendacoes(
                                          selectedRecomendacoes.filter(id => id !== recomendacao._id)
                                        );
                                      }
                                    }}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium text-sm">{recomendacao.nome}</p>
                                      <Badge variant="outline" className="text-xs">
                                        {recomendacao.origem === 'doenca' ? 'Doença' : 'Sintoma'}
                                      </Badge>
                                    </div>
                                    {recomendacao.descricao && (
                                      <p className="text-xs text-muted-foreground">{recomendacao.descricao}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Nenhuma recomendação disponível para esta doença e sintomas.
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="shadow-lg border-0">
                        <CardHeader className="bg-linear-to-r border-b">
                          <CardTitle className="text-lg">Anotações Médicas</CardTitle>
                          <CardDescription>Adicione observações adicionais (opcional)</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="notes" className="text-base font-medium">
                              Observações
                            </Label>
                            <Textarea
                              id="notes"
                              placeholder="Adicione qualquer observação ou ajuste ao pré-diagnóstico..."
                              value={validationNotes}
                              onChange={(e) => setValidationNotes(e.target.value)}
                              rows={4}
                              className="resize-none"
                            />
                          </div>

                          <Alert className="border-blue-200 bg-blue-50">
                            <AlertDescription className="text-blue-800">
                              Ao validar, o paciente será notificado e receberá as recomendações selecionadas.
                            </AlertDescription>
                          </Alert>

                          <div className="grid grid-cols-2 gap-4">
                            <Button
                              variant="outline"
                              className="w-full bg-transparent"
                              onClick={() => {
                                setValidationNotes("");
                                setSelectedRecomendacoes([]);
                              }}
                            >
                              Limpar
                            </Button>
                            <Button
                              onClick={handleValidate}
                              disabled={isValidating || !selectedReport || !selectedDoencaId}
                              className="w-full"
                              size="lg"
                            >
                              {isValidating ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Validando...
                                </>
                              ) : (
                                "Validar Diagnóstico"
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}