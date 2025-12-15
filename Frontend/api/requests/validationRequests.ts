import { endpoint } from "../apiURL";

/**
 * Interface para dados de validação de diagnóstico
 */
export interface DiagnosisValidationData {
    doenca: string;
    recomendacoes_medicos?: string[];
    notas?: string;
    diagnostico_final?: string;
    recomendacoes_livres?: string[];
    confiancaDiagnostico?: 'baixa' | 'media' | 'alta';
    tratamentoPrescrito?: string;
}

/**
 * Interface para resposta da validação
 */
export interface ValidationResponse {
    success: boolean;
    data?: {
        consulta: {
            id: string;
            status: string;
            data_validacao: string;
            doenca?: {
                nome: string;
                descricao?: string;
            };
        };
        diagnostico: {
            confianca?: string;
            observacoes?: string;
        };
        recomendacoes: {
            total: number;
            selecionadas: string[];
        };
    };
    message: string;
    error?: string;
}

/**
 * Validar diagnóstico e atualizar doença e recomendações (requer autenticação de médico)
 * @param id - ID da consulta
 * @param token - Token de autenticação
 * @param data - Dados contendo doenca, recomendacoes_medicos e opcionais
 */
export const validateDiagnosisRequest = async (
    id: string,
    token: string,
    data: DiagnosisValidationData
): Promise<Response> => {
    try {
        console.log("📤 [validationRequests] Validando diagnóstico:", {
            consultaId: id,
            data: data
        });

        // Validar dados obrigatórios
        if (!data.doenca) {
            throw new Error("O campo 'doenca' é obrigatório");
        }

        // Preparar payload final
        const payload = {
            doenca: data.doenca,
            ...(data.recomendacoes_medicos && data.recomendacoes_medicos.length > 0 && {
                recomendacoes_medicos: data.recomendacoes_medicos
            }),
            ...(data.notas && { notas: data.notas }),
            ...(data.diagnostico_final && { diagnostico_final: data.diagnostico_final }),
            ...(data.recomendacoes_livres && data.recomendacoes_livres.length > 0 && {
                recomendacoes_livres: data.recomendacoes_livres
            }),
            ...(data.confiancaDiagnostico && { confiancaDiagnostico: data.confiancaDiagnostico }),
            ...(data.tratamentoPrescrito && { tratamentoPrescrito: data.tratamentoPrescrito })
        };

        console.log("📦 Payload enviado:", payload);

        const response = await fetch(endpoint.ConsultaValidateDiagnosis(id), {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        console.log("📥 [validationRequests] Resposta da validação:", {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText
        });

        return response;

    } catch (e) {
        console.error("❌ [validationRequests] Erro ao validar diagnóstico", e);
        throw e;
    }
};

/**
 * Validar diagnóstico e retornar dados parseados
 * @param id - ID da consulta
 * @param token - Token de autenticação
 * @param data - Dados de validação
 */
export const validateDiagnosisAndParse = async (
    id: string,
    token: string,
    data: DiagnosisValidationData
): Promise<ValidationResponse> => {
    try {
        const response = await validateDiagnosisRequest(id, token, data);

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Erro ${response.status}: Falha na validação`;

            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }

            throw new Error(errorMessage);
        }

        const result = await response.json();
        return result as ValidationResponse;

    } catch (e) {
        console.error("❌ [validationRequests] Erro ao processar resposta:", e);
        throw e;
    }
};

/**
 * Obter dados de validação para uma consulta (doenças compatíveis, recomendações, etc.)
 * @param id - ID da consulta
 * @param token - Token de autenticação
 */
export const getValidationDataRequest = async (
    id: string,
    token: string
): Promise<Response> => {
    try {
        console.log("📤 [validationRequests] Obtendo dados para validação da consulta:", id);

        const response = await fetch(endpoint.consultaById(id) + '/validation-data', {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        console.log("📥 [validationRequests] Resposta dos dados de validação:", {
            status: response.status,
            ok: response.ok
        });

        return response;

    } catch (e) {
        console.error("❌ [validationRequests] Erro ao obter dados de validação", e);
        throw e;
    }
};

/**
 * Obter recomendações disponíveis para uma consulta
 * @param id - ID da consulta
 * @param token - Token de autenticação
 */
export const getRecommendationsRequest = async (
    id: string,
    token: string
): Promise<Response> => {
    try {
        console.log("📤 [validationRequests] Obtendo recomendações para consulta:", id);

        const response = await fetch(endpoint.ConsultaRecommendations(id), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        console.log("📥 [validationRequests] Resposta das recomendações:", {
            status: response.status,
            ok: response.ok
        });

        return response;

    } catch (e) {
        console.error("❌ [validationRequests] Erro ao obter recomendações", e);
        throw e;
    }
};

/**
 * Validar múltiplos diagnósticos em lote
 * @param validations - Array de validações a serem processadas
 * @param token - Token de autenticação
 */
export const batchValidateDiagnosis = async (
    validations: Array<{
        consultaId: string;
        data: DiagnosisValidationData;
    }>,
    token: string
): Promise<Array<{ consultaId: string; success: boolean; message: string }>> => {
    try {
        console.log("📤 [validationRequests] Validando em lote:", validations.length, "diagnósticos");

        const results = await Promise.all(
            validations.map(async (validation) => {
                try {
                    const response = await validateDiagnosisRequest(
                        validation.consultaId,
                        token,
                        validation.data
                    );

                    const result = await response.json();

                    return {
                        consultaId: validation.consultaId,
                        success: response.ok,
                        message: result.message || (response.ok ? 'Validado com sucesso' : 'Erro na validação')
                    };

                } catch (error) {
                    return {
                        consultaId: validation.consultaId,
                        success: false,
                        message: error instanceof Error ? error.message : 'Erro desconhecido'
                    };
                }
            })
        );

        console.log("📥 [validationRequests] Resultados do lote:", results);
        return results;

    } catch (e) {
        console.error("❌ [validationRequests] Erro na validação em lote", e);
        throw e;
    }
};

/**
 * Verificar se uma consulta está pronta para validação
 * @param id - ID da consulta
 * @param token - Token de autenticação
 */
export const checkIfReadyForValidation = async (
    id: string,
    token: string
): Promise<{ ready: boolean; status: string; message: string }> => {
    try {
        console.log("🔍 [validationRequests] Verificando prontidão para validação:", id);

        const response = await fetch(endpoint.consultaById(id), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Erro ao verificar consulta: ${response.status}`);
        }

        const consulta = await response.json();

        // Verificar se a consulta está no status correto para validação
        const isPending = consulta.data?.status === 'preliminar';
        const hasSymptoms = consulta.data?.sintomas && consulta.data.sintomas.length > 0;
        const hasPatient = !!consulta.data?.paciente;

        const ready = isPending && hasSymptoms && hasPatient;

        const message = !isPending
            ? 'Consulta não está pendente de validação'
            : !hasSymptoms
                ? 'Consulta não possui sintomas'
                : !hasPatient
                    ? 'Consulta não possui paciente associado'
                    : 'Pronta para validação';

        return {
            ready,
            status: consulta.data?.status || 'desconhecido',
            message
        };

    } catch (e) {
        console.error("❌ [validationRequests] Erro ao verificar prontidão", e);
        throw e;
    }
};

/**
 * Obter estatísticas de validação do médico
 * @param token - Token de autenticação
 */
export const getValidationStatsRequest = async (
    token: string
): Promise<Response> => {
    try {
        console.log("📤 [validationRequests] Obtendo estatísticas de validação");

        const response = await fetch(endpoint.consultas + '/dashboard/validation', {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        console.log("📥 [validationRequests] Resposta das estatísticas:", {
            status: response.status,
            ok: response.ok
        });

        return response;

    } catch (e) {
        console.error("❌ [validationRequests] Erro ao obter estatísticas", e);
        throw e;
    }
};

/**
 * Cancelar validação de diagnóstico (reverter para status anterior)
 * @param id - ID da consulta
 * @param token - Token de autenticação
 * @param reason - Motivo do cancelamento
 */
export const cancelValidationRequest = async (
    id: string,
    token: string,
    reason?: string
): Promise<Response> => {
    try {
        console.log("📤 [validationRequests] Cancelando validação da consulta:", id);

        const payload = {
            motivo: reason || 'Validação cancelada pelo médico'
        };

        const response = await fetch(endpoint.consultaById(id) + '/cancel-validation', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        console.log("📥 [validationRequests] Resposta do cancelamento:", {
            status: response.status,
            ok: response.ok
        });

        return response;

    } catch (e) {
        console.error("❌ [validationRequests] Erro ao cancelar validação", e);
        throw e;
    }
};