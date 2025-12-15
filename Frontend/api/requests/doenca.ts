import { endpoint } from "../apiURL";

export function  getProtocolosDoencaSintomasRequest(token: string) {
    return fetch(endpoint.doencaSintomasQtdProtocolos, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });
}

export const listDoencasRequest = async () => {
    try {
        const response = await fetch(endpoint.doencas, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        return response;
    } catch (e) {
        console.error('Erro ao listar doenças', e);
        throw e;
    }
};

/**
 * Obter uma doença específica com recomendações
 * @param id - ID da doença
 */
export const getDoencaRequest = async (id: string, token?: string) => {
    try {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        const authToken = token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined);
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        const response = await fetch(endpoint.doencaById(id), {
            method: 'GET',
            headers,
        });
        return response;
    } catch (e) {
        console.error('Erro ao obter doença', e);
        throw e;
    }
};
