"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboard } from "./admin-dashboard";
import { LoadingScreen } from "./loading-screen";
import {
  getQtdConsultasMesRequest,
  getQtdConsultasRequest,
  getUserCountRequest,
} from "@/api/requests/auth";
import { getProtocolosDoencaSintomasRequest } from "@/api/requests/doenca";

interface PreloadedDashboardProps {
  minLoadingDuration?: number;
}

/**
 * Wrapper que pré-carrega dados enquanto LoadingScreen está visível
 * Implementa Opção 2: Pré-carregamento em background
 */
export function AdminDashboardPreloader({ minLoadingDuration = 2500 }: PreloadedDashboardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [preloadedData, setPreloadedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipLoading, setSkipLoading] = useState(false);

  useEffect(() => {
    // Verificar se deve pular o LoadingScreen (retorno do settings)
    const skip = typeof window !== "undefined" && sessionStorage.getItem("skipLoadingScreen") === "true"
    if (skip) {
      setSkipLoading(true)
      sessionStorage.removeItem("skipLoadingScreen")
      setIsLoading(false)
      return
    }
    const preloadData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        // Carregar todos os dados em paralelo
        const [userCountRes, consultasRes, consultasMesRes, protocolosRes] = await Promise.allSettled([
          getUserCountRequest(token),
          getQtdConsultasRequest(token),
          getQtdConsultasMesRequest(token),
          getProtocolosDoencaSintomasRequest(token),
        ]);

        const data: any = {};

        if (userCountRes.status === "fulfilled" && userCountRes.value.ok) {
          const json = await userCountRes.value.json();
          data.userCount = json.data;
        }

        if (consultasRes.status === "fulfilled" && consultasRes.value.ok) {
          const json = await consultasRes.value.json();
          data.consultaQtd = json.data;
        }

        if (consultasMesRes.status === "fulfilled" && consultasMesRes.value.ok) {
          const json = await consultasMesRes.value.json();
          data.consultaQtdMes = json.data;
        }

        if (protocolosRes.status === "fulfilled" && protocolosRes.value.ok) {
          const json = await protocolosRes.value.json();
          data.protocolosCount = json.data?.length || 0;
        }

        setPreloadedData(data);
      } catch (err) {
        console.error("Erro ao pré-carregar dados:", err);
        setError("Erro ao carregar dados");
      } finally {
        setIsLoading(false);
      }
    };

    preloadData();
  }, [router]);

  const handleLoadingComplete = () => {
    // LoadingScreen completou o tempo mínimo
    // Dados já foram carregados em paralelo e dashboard está pronto
    if (error) {
      console.warn("Dashboard aberto com erro:", error);
    }
  };

  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};

  return (
    <>
      {isLoading && (
        <LoadingScreen
          userType={user.tipo || "admin"}
          onLoadComplete={handleLoadingComplete}
          minDuration={minLoadingDuration}
        />
      )}
      {!isLoading && <AdminDashboard preloadedData={preloadedData} />}
    </>
  );
}
