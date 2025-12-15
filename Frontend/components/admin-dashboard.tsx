"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  FileText,
  Settings,
  BarChart,
  Stethoscope,
} from "lucide-react";
import { useEffect, useState } from "react";
import { UserDropdown } from "@/components/user-dropdown";
import {
  getQtdConsultasMesRequest,
  getQtdConsultasRequest,
  getUserCountRequest,
} from "@/api/requests/auth";
import { getProtocolosDoencaSintomasRequest } from "@/api/requests/doenca";

export function AdminDashboard({ preloadedData }: { preloadedData?: any } = {}) {
  const router = useRouter();
  const [userCount, setUserCount] = useState<number | undefined>(preloadedData?.userCount);
  const [protocolosCount, setProtocolosCount] = useState<number | undefined>(preloadedData?.protocolosCount);
  const [consultaQtdMes, setConsultaQtdMes] = useState<number | undefined>(preloadedData?.consultaQtdMes);
  const [consultaQtd, setConsultaQtd] = useState<number | undefined>(preloadedData?.consultaQtd);
  const [userInfo, setUserInfo] = useState<{ nome: string; email: string; tipo: string }>({ nome: 'Utilizador', email: '', tipo: 'admin' });

  useEffect(() => {
    const getPrimaryData = async () => {
      try {
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user") || "{}");

        // Set user info from localStorage
        if (user && user.nome) {
          setUserInfo({
            nome: user.nome,
            email: user.email || '',
            tipo: user.tipo || 'admin'
          });
        }

        // Redirect to login if no token or not admin
        if (!token || user.tipo !== "admin") {
          router.push("/login");
          return;
        }
        const userCountResponse = await getUserCountRequest(token || "");
        const protocolosCountResponse = await getProtocolosDoencaSintomasRequest(
          token || ""
        );
        const consultasQtdMesResponse = await getQtdConsultasMesRequest(
          token || ""
        );
        const consultasQtdResponse = await getQtdConsultasRequest(token || "");

        // If any request reports unauthorized, redirect to login
        if (
          userCountResponse.status === 401 ||
          protocolosCountResponse.status === 401 ||
          consultasQtdMesResponse.status === 401 ||
          consultasQtdResponse.status === 401
        ) {
          router.push("/login");
          return;
        }

        // Set each stat individually to allow partial successes
        try {
          if (userCountResponse.ok) {
            const body = await userCountResponse.json();
            setUserCount(body?.data ?? 0);
          }
        } catch (err) {
          console.error("Erro ao processar userCountResponse", err);
        }

        try {
          if (consultasQtdResponse.ok) {
            const body = await consultasQtdResponse.json();
            setConsultaQtd(body?.data ?? 0);
          }
        } catch (err) {
          console.error("Erro ao processar consultasQtdResponse", err);
        }

        try {
          if (consultasQtdMesResponse.ok) {
            const body = await consultasQtdMesResponse.json();
            setConsultaQtdMes(body?.data ?? 0);
          }
        } catch (err) {
          console.error("Erro ao processar consultasQtdMesResponse", err);
        }

        try {
          if (protocolosCountResponse.ok) {
            const body = await protocolosCountResponse.json();
            setProtocolosCount(body?.data ?? 0);
          }
        } catch (err) {
          console.error("Erro ao processar protocolosCountResponse", err);
        }
      } catch (e: any) {
        console.error("Erro ao carregar dados do dashboard", e);
      }
    };

    // Chamar a função criada para obter os dados
    void getPrimaryData();
  }, []);
  const stats = [
    { label: "Total de Utilizadores", value: userCount, icon: Users },
    { label: "Relatórios Gerados", value: consultaQtd, icon: FileText },
    { label: "Protocolos Ativos", value: protocolosCount, icon: Settings },
    { label: "Consultas Este Mês", value: consultaQtdMes, icon: BarChart },
  ];

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-semibold">Medical Assistant</h1>
        </div>


        <UserDropdown nome={userInfo.nome} email={userInfo.email} tipo={userInfo.tipo as "admin" | "medico" | "paciente"} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gerir Utilizadores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Registe novos utilizadores, atribua perfis e gerencie permissões
            </p>
            <Button
              className="w-full"
              onClick={() => router.push("/admin/users")}
            >
              Gerir Utilizadores
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Protocolos Clínicos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Crie e edite diretrizes médicas e algoritmos de análise
            </p>
            <Button
              className="w-full"
              onClick={() => router.push("/admin/protocols")}
            >
              Gerir Protocolos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatórios do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Visualize estatísticas e relatórios de uso do sistema
            </p>
            <Button className="w-full bg-transparent" variant="outline">
              Ver Relatórios
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Auditoria de Acessos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Monitore acessos e atividades dos utilizadores
            </p>
            <Button className="w-full bg-transparent" variant="outline">
              Ver Auditoria
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
