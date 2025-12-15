import { endpoint } from "../apiURL";

interface NewUserData {
  nome: string;
  email: string;
  password: string;
  tipo: "paciente" | "medico" | "admin";
  [key: string]: any;
}

export const listUsersRequest = async (token?: string) => {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(endpoint.users, {
      method: "GET",
      headers,
    });

    return response;
  } catch (e) {
    console.error("Erro ao listar utilizadores", e);
    throw e;
  }
};

export const getUserRequest = async (id: string, token?: string) => {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(endpoint.userById(id), {
      method: "GET",
      headers,
    });

    return response;
  } catch (e) {
    console.error("Erro ao obter utilizador", e);
    throw e;
  }
};

export const createUserRequest = async (data: NewUserData, token?: string) => {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(endpoint.users, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    return response;
  } catch (e) {
    console.error("Erro ao criar utilizador", e);
    throw e;
  }
};

export const updateUserRequest = async (id: string, data: Partial<NewUserData>, token?: string) => {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(endpoint.userById(id), {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });

    return response;
  } catch (e) {
    console.error("Erro ao atualizar utilizador", e);
    throw e;
  }
};

export const deleteUserRequest = async (id: string, token?: string) => {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(endpoint.userById(id), {
      method: "DELETE",
      headers,
    });

    return response;
  } catch (e) {
    console.error("Erro ao apagar utilizador", e);
    throw e;
  }
};

export const changePasswordRequest = async (
  id: string,
  senhaAtual: string,
  novaSenha: string,
  token?: string
) => {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${endpoint.users}/${id}/change-password`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        senhaAtual,
        novaSenha,
      }),
    });

    return response;
  } catch (e) {
    console.error("Erro ao alterar senha", e);
    throw e;
  }
};
