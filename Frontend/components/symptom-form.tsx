"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  AlertCircle,
  Stethoscope,
  Search,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { getSintomaRequest, listSintomasRequest, listMockSintomasRequest, matchSymptomsNlpRequest } from "@/api/requests";
import { makeConsultaRequest } from "@/api/requests/consultas";
import { UserDropdown } from "./user-dropdown";

export function SymptomForm({ preloadedSymptoms }: { preloadedSymptoms?: any[] } = {}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [intensity, setIntensity] = useState([5]);
  const [duration, setDuration] = useState("");
  const [frequency, setFrequency] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]); // Nomes dos sintomas selecionados
  const [searchTerm, setSearchTerm] = useState(""); // 🔍 novo estado de pesquisa
  const [userInfo, setUserInfo] = useState({
    nome: "",
    email: "",
    tipo: "paciente" as const,
  });

  // Manter objetos completos dos sintomas para ter acesso aos IDs
  const [symptomsData, setSymptomsData] = useState<any[]>(preloadedSymptoms || []);
  const preloadedSymptomsNames = preloadedSymptoms?.map((s: any) => s.nome || s.name || String(s)) || [];
  const [possibleSymptoms, setPossibleSymptoms] = useState<string[]>(preloadedSymptomsNames);
  const [loading, setLoading] = useState(!preloadedSymptoms || preloadedSymptoms.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpError, setNlpError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);


  const filteredSymptoms = possibleSymptoms.filter((symptom) =>
    symptom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Buscar sintomas da API no mount
  useEffect(() => {
    let mounted = true;
    
    // Load user info from localStorage
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserInfo({
      nome: user.nome || "",
      email: user.email || "",
      tipo: "paciente",
    });
    
    // Se sintomas foram pré-carregados, não precisa carregar novamente
    if (preloadedSymptoms && preloadedSymptoms.length > 0) {
      setLoading(false);
      return;
    }
    
    async function loadSymptoms() {
      setLoading(true);
      setError(null);
      try {
        // Primeiro tenta BD; se vazio/falhar, usa mock do serviço NLP
        const res = await listSintomasRequest();
        let items: any[] = [];
        if (res.ok) {
          const json = await res.json();
          items = Array.isArray(json.data) ? json.data : [];
        }

        if (!res.ok || items.length === 0) {
          const mockRes = await listMockSintomasRequest();
          if (!mockRes.ok) throw new Error(`Erro ao carregar sintomas: ${mockRes.status}`);
          const mockJson = await mockRes.json();
          items = Array.isArray(mockJson.data) ? mockJson.data : [];
        }

        const names = items.map((it: any) => it.nome || it.name || String(it));
        if (mounted) {
          setPossibleSymptoms(names);
          setSymptomsData(items); // Guardar objetos completos
        }
      } catch (err: any) {
        if (mounted) setError(err.message || "Erro desconhecido");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSymptoms();
    return () => {
      mounted = false;
    };
  }, []);

  // Sugestão automática de sintomas via NLP mock a partir da descrição
  useEffect(() => {
    const controller = new AbortController();
    const descriptionText = description.trim();
    if (descriptionText.length < 10) {
      setNlpLoading(false);
      setNlpError(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setNlpLoading(true);
        setNlpError(null);
        const res = await matchSymptomsNlpRequest(descriptionText, 6);
        if (!res.ok) throw new Error(`Erro ao sugerir sintomas: ${res.status}`);
        const json = await res.json();
        const names = Array.isArray(json.data)
          ? json.data.map((it: any) => it.name || it.nome || String(it))
          : [];
        // Mescla evitando duplicados
        setPossibleSymptoms((prev) => {
          const merged = Array.from(new Set([...(names || []), ...prev]));
          return merged;
        });
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setNlpError(err.message || "Erro ao sugerir sintomas");
      } finally {
        setNlpLoading(false);
      }
    }, 400); // debounce

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [description]);

  const handleCheckboxChange = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

const handleSubmit = async () => {
    try {
        const token = localStorage.getItem("token");
        
        console.log("🔍 === handleSubmit ===");
        
        if (!token) {
            setError("Token não encontrado. Faça login novamente.");
            router.push("/login");
            return;
        }

        setSubmitting(true);
        setError(null);

        // Agora faz a consulta
        const result = await makeConsultaRequest(
            token,
            [],
            description.trim()
        );

        console.log("✅ Resultado recebido:", result);
        
        // Verificar se houve resultados
        if (result.data && Array.isArray(result.data)) {
            // EXTRAIR OS SINTOMAS
            const sintomasDaConsulta = result.data.length > 0 
                ? (result.data[0].sintomasConsulta || []) 
                : [];
            
            console.log("📊 Sintomas da consulta:", sintomasDaConsulta);
            
            // Salvar resultados COMPLETOS no localStorage
            const dadosParaSalvar = {
                data: result.data,
                metadata: result.metadata,
                timestamp: new Date().toISOString(),
                message: result.message,
                consultaId: result.consultaId,
                sintomasConsulta: sintomasDaConsulta,
                descricaoOriginal: description.trim(),
                qtdSintomas: sintomasDaConsulta.length
            };
            
            console.log("💾 Salvando no localStorage:", dadosParaSalvar);
            localStorage.setItem("consultaResultados", JSON.stringify(dadosParaSalvar));
            
            console.log("✅ Redirecionando para /patient/results");
            router.push("/patient/results");
        } else {
            const errorMsg = result.message || "Nenhuma doença encontrada com os sintomas fornecidos.";
            console.log("⚠️ Sem dados:", errorMsg);
            setError(errorMsg);
        }
        
    } catch (err: any) {
        console.error("❌ Erro no handleSubmit:", err);
        setError(err.message || "Erro ao enviar sintomas. Tente novamente.");
    } finally {
        setSubmitting(false);
    }
};
  const handleLogout = () => {
    router.push("/login");
  };

  const isFormValid = description.trim().length > 0 && duration && frequency;

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-7 w-7 text-primary" />
          <span className="text-xl font-semibold ml-2">Medical Assistant</span>
        </div>
        <UserDropdown
          nome={userInfo.nome}
          email={userInfo.email}
          tipo={userInfo.tipo}
        />
      </div>

      {/* Layout de duas colunas */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Coluna principal direita */}
        <div className="md:w-2/3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Descrição dos Sintomas</CardTitle>
              <CardDescription className="text-sm">
                As suas informações ajudam-nos a entender melhor o seu estado de
                saúde
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="description">O que está a sentir?</Label>
              <Textarea
                id="description"
                placeholder="Exemplo: Estou com dor de cabeça forte há 3 dias, principalmente pela manhã..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                className="resize-none"
              />
              

              {/* 🔽 Mostra sintomas selecionados */}
              {selectedSymptoms.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium">
                    Sintomas selecionados:
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedSymptoms.map((symptom) => (
                      <span
                        key={symptom}
                        className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* 🔼 Fim da nova secção */}

              <p className="text-xs text-muted-foreground">
                Inclua informações com a localização da dor e sintomas
                associados
              </p>
            </CardContent>
          </Card>

          {description.trim().length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Informações Adicionais
                </CardTitle>
                <CardDescription>
                  Ajude-nos a entender melhor os seus sintomas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Intensidade: {intensity[0]}/10</Label>
                  <Slider
                    value={intensity}
                    onValueChange={setIntensity}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Leve</span>
                    <span>Moderada</span>
                    <span>Severa</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">
                    Há quanto tempo tem estes sintomas?
                  </Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger id="duration">
                      <SelectValue placeholder="Selecione a duração" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutos</SelectItem>
                      <SelectItem value="hours">Horas</SelectItem>
                      <SelectItem value="days">Dias</SelectItem>
                      <SelectItem value="weeks">Semanas</SelectItem>
                      <SelectItem value="months">Meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">
                    Com que frequência sente estes sintomas?
                  </Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger id="frequency">
                      <SelectValue placeholder="Selecione a frequência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="constant">
                        Constante (o tempo todo)
                      </SelectItem>
                      <SelectItem value="frequent">
                        Frequente (várias vezes ao dia)
                      </SelectItem>
                      <SelectItem value="occasional">
                        Ocasional (algumas vezes por semana)
                      </SelectItem>
                      <SelectItem value="rare">
                        Raro (menos de uma vez por semana)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {description.trim().length > 0 && !isFormValid && (
            <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Informações incompletas</p>
                <p className="text-amber-700">
                  Por favor, preencha a duração e frequência dos sintomas.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Erro</p>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            className="w-full"
            size="lg"
            disabled={!isFormValid || submitting}
          >
            {submitting ? "Enviando..." : "Enviar Sintomas"}
          </Button>
        </div>

        {/* Coluna lateral esquerda */}
        <div className="md:w-1/3 space-y-4">
          <Card>
            <CardContent>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Procurar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-4xl border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
              </div>

              <div className="space-y-2">
                <Label>Possíveis Sintomas</Label>
                {loading ? (
                  <p className="text-sm text-muted-foreground italic">
                    Carregando sintomas...
                  </p>
                ) : error ? (
                  <p className="text-sm text-red-600 italic">
                    Erro ao carregar: {error}
                  </p>
                ) : filteredSymptoms.length > 0 ? (
                  filteredSymptoms.map((symptom) => (
                    <div key={symptom} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedSymptoms.includes(symptom)}
                        onCheckedChange={() => handleCheckboxChange(symptom)}
                        className="rounded-4xl border border-border"
                      />
                      <span className="text-sm">{symptom}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhum sintoma encontrado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
