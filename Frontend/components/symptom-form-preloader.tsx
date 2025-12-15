"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SymptomForm } from "./symptom-form";
import { LoadingScreen } from "./loading-screen";
import { listSintomasRequest, listMockSintomasRequest } from "@/api/requests";

interface PreloadedSymptomsProps {
  minLoadingDuration?: number;
}

export function SymptomFormPreloader({ minLoadingDuration = 2500 }: PreloadedSymptomsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [preloadedSymptoms, setPreloadedSymptoms] = useState<any[]>([]);
  // Mantém o tipo de usuário estável entre SSR e cliente para evitar hydration mismatch
  const [userType, setUserType] = useState<"patient" | "doctor" | "admin">("patient");

  useEffect(() => {
    const preloadData = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
        if (user?.tipo) {
          const normalizedType =
            user.tipo === "paciente" ? "patient" :
            user.tipo === "medico" ? "doctor" :
            user.tipo === "admin" ? "admin" : "patient";
          setUserType(normalizedType);
        }

        if (!token || user.tipo !== "paciente") {
          router.push("/login");
          return;
        }

        // Pré-carregar sintomas
        // Tenta BD; se vazio ou falhar, cai para mock do backend (symptom-nlp/mock-symptoms)
        const response = await listSintomasRequest();
        let items: any[] = [];
        if (response.ok) {
          const data = await response.json();
          items = Array.isArray(data.data) ? data.data : [];
        }
        if (!response.ok || items.length === 0) {
          const mockRes = await listMockSintomasRequest();
          if (mockRes.ok) {
            const mockJson = await mockRes.json();
            items = Array.isArray(mockJson.data) ? mockJson.data : [];
          }
        }
        setPreloadedSymptoms(items);
      } catch (err) {
        console.error("Erro ao pré-carregar sintomas:", err);
      } finally {
        setIsLoading(false);
      }
    };

    preloadData();
  }, [router]);

  return (
    <>
      {isLoading && (
        <LoadingScreen
          userType={userType}
          minDuration={minLoadingDuration}
        />
      )}
      {!isLoading && <SymptomForm preloadedSymptoms={preloadedSymptoms} />}
    </>
  );
}
