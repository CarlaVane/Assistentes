import { endpoint } from "../apiURL";

interface ConsultaData {
    medico: string;
    recomendacoes_medicos?: string[];
    resultado?: string;
    notas?: string;
    [key: string]: any;
}

/**
 * Listar todas as consultas (requer autenticação de médico)
 * @param token - Token de autenticação
 */
export const listConsultasRequest = async (token: string) => {
    try {
        const response = await fetch(endpoint.consultas, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        return response;
    } catch (e) {
        console.error("Erro ao listar consultas", e);
        throw e;
    }
};

/**
 * Obter uma consulta específica
 * @param id - ID da consulta
 * @param token - Token de autenticação
 */
export const getConsultaRequest = async (id: string, token: string) => {
    try {
        const response = await fetch(endpoint.consultaById(id), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        return response;
    } catch (e) {
        console.error("Erro ao obter consulta", e);
        throw e;
    }
};

/**
 * Criar uma nova consulta (requer autenticação de paciente)
 * @param token - Token de autenticação
 * @param consultaData - Dados da consulta
 */
export const createConsultaRequest = async (
    token: string,
    consultaData: ConsultaData
) => {
    try {
        const response = await fetch(endpoint.consultas, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(consultaData),
        });

        return response;
    } catch (e) {
        console.error("Erro ao criar consulta", e);
        throw e;
    }
};

/**
 * Atualizar uma consulta (proprietário ou admin)
 * @param id - ID da consulta
 * @param token - Token de autenticação
 * @param consultaData - Dados a atualizar
 */
export const updateConsultaRequest = async (
    id: string,
    token: string,
    consultaData: Partial<ConsultaData>
) => {
    try {
        const response = await fetch(endpoint.consultaById(id), {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(consultaData),
        });

        return response;
    } catch (e) {
        console.error("Erro ao atualizar consulta", e);
        throw e;
    }
};

/**
 * Deletar uma consulta (requer autenticação de admin)
 * @param id - ID da consulta
 * @param token - Token de autenticação
 */
export const deleteConsultaRequest = async (id: string, token: string) => {
    try {
        const response = await fetch(endpoint.consultaById(id), {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        return response;
    } catch (e) {
        console.error("Erro ao deletar consulta", e);
        throw e;
    }
};

/**
 * Aprovar uma consulta (requer autenticação de médico)
 * @param id - ID da consulta
 * @param token - Token de autenticação
 */
export const approveConsultaRequest = async (id: string, token: string) => {
    try {
        const response = await fetch(endpoint.consultaApprove(id), {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        return response;
    } catch (e) {
        console.error("Erro ao aprovar consulta", e);
        throw e;
    }
};

/**
 * Cancelar uma consulta (proprietário ou admin)
 * @param id - ID da consulta
 * @param token - Token de autenticação
 */
export const cancelConsultaRequest = async (id: string, token: string) => {
    try {
        const response = await fetch(endpoint.consultaCancel(id), {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        return response;
    } catch (e) {
        console.error("Erro ao cancelar consulta", e);
        throw e;
    }
};

/**
 * Marcar consulta como realizada (requer autenticação de médico)
 * @param id - ID da consulta
 * @param token - Token de autenticação
 */
export const markConsultaAsDoneRequest = async (
    id: string,
    token: string
) => {
    try {
        const response = await fetch(endpoint.consultaMarkAsDone(id), {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        return response;
    } catch (e) {
        console.error("Erro ao marcar consulta como realizada", e);
        throw e;
    }
};

/**
 * Fazer diagnóstico para uma consulta (requer autenticação de médico)
 * @param id - ID da consulta
 * @param token - Token de autenticação
 */
export const diagnoseConsultaRequest = async (id: string, token: string) => {
    try {
        const response = await fetch(endpoint.consultaDiagnose(id), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        return response;
    } catch (e) {
        console.error("Erro ao fazer diagnóstico", e);
        throw e;
    }
};

/**
 * Obter relatórios de consultas validadas (requer autenticação de médico)
 * @param token - Token de autenticação
 */
export const getValidatedReportsRequest = async (token: string) => {
    try {
        const response = await fetch(endpoint.consultaValidatedReports, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        return response;
    } catch (e) {
        console.error("Erro ao obter relatórios validados", e);
        throw e;
    }
};

// consultaValidatedReportDetails
export const getValidatedReportDetailsRequest = async (token: string, id: string) => {
    try {
        const response = await fetch(endpoint.consultaValidatedReportDetails(id), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        return response;
    } catch (e) {
        console.error("Erro ao obter relatórios validados", e);
        throw e;
    }
};
export const consultaMarkAsDone = async (token: string, id: string) => {
    try {
        const response = await fetch(endpoint.consultaMarkAsDone(id), {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        return response;         
    } catch (e) {
        console.error("Erro ao marcar consulta como realizada", e);
        throw e;
    }
}

/**
 * Obter consultas pendentes para validação (requer autenticação de médico)
 * @param token - Token de autenticação
 */
export const getPendingConsultasRequest = async (token: string) => {
    try {
        const response = await fetch(endpoint.consultaPending, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        return response;
    } catch (e) {
        console.error("Erro ao obter consultas pendentes", e);
        throw e;
    }
};

/**
 * Criar consulta com sintomas e obter diagnóstico
 * @param token - Token de autenticação
 * @param bodySintomas - Array de IDs de sintomas selecionados
 * @param descricao - Descrição textual dos sintomas (opcional)
 */
export const makeConsultaRequest = async (
    token: string,
    sintomas: string[],
    descricao?: string
) => {
    try {
        const response = await fetch(endpoint.consultaMakeConsulta, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                sintomas,
                descricao: descricao || null,
            }),
        });

        return response;
    } catch (e) {
        console.error("Erro ao criar consulta com diagnóstico", e);
        throw e;
    }

    
};

/**
 * Validar diagnóstico e atualizar doença e recomendações (requer autenticação de médico)
 * @param id - ID da consulta
 * @param token - Token de autenticação
 * @param data - Dados contendo doenca e recomendacoes_medicos
 */
export const validateDiagnosisRequest = async (
    id: string,
    token: string,
    data: { doenca?: string; recomendacoes_medicos?: string[] }
) => {
    try {
        const response = await fetch(endpoint.ConsultaValidateDiagnosis(id), {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        return response;
    } catch (e) {
        console.error("Erro ao validar diagnóstico", e);
        throw e;
    }
};

/**
 * Obter recomendações de sintomas e doença de uma consulta (requer autenticação de médico)
 * @param id - ID da consulta
 * @param token - Token de autenticação
 */
export const getConsultaRecommendationsRequest = async (
    id: string,
    token: string
) => {
    try {
        const response = await fetch(endpoint.ConsultaRecommendations(id), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        return response;
    } catch (e) {
        console.error("Erro ao obter recomendações da consulta", e);
        throw e;
    }
};
