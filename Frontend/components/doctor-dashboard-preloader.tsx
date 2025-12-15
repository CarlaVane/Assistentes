"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DoctorDashboard } from "./doctor-dashboard";
import { LoadingScreen } from "./loading-screen";
import { getValidatedReportsRequest } from "@/api/requests/consultas";

interface PreloadedDashboardProps {
  minLoadingDuration?: number;
}

export function DoctorDashboardPreloader({ minLoadingDuration = 2500 }: PreloadedDashboardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [preloadedData, setPreloadedData] = useState<any>(null);

  useEffect(() => {
    const preloadData = async () => {
      try {
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user") || "{}");

        if (!token || user.tipo !== "medico") {
          router.push("/login");
          return;
        }

        // Pré-carregar consultações
        const response = await getValidatedReportsRequest(token);
        if (response.ok) {
          const data = await response.json();
          setPreloadedData(data.data || []);
        }
      } catch (err) {
        console.error("Erro ao pré-carregar consultações:", err);
      } finally {
        setIsLoading(false);
      }
    };

    preloadData();
  }, [router]);

  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
  const normalizedType =
    user?.tipo === "paciente" ? "patient" :
    user?.tipo === "medico" ? "doctor" :
    user?.tipo === "admin" ? "admin" : "doctor";

  return (
    <>
      {isLoading && (
        <LoadingScreen
          userType={normalizedType}
          minDuration={minLoadingDuration}
        />
      )}
      {!isLoading && <DoctorDashboard preloadedConsultations={preloadedData} />}
    </>
  );
}
