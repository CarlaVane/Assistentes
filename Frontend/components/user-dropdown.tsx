"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  LogOut,
  Shield,
  Mail,
  Settings,
  FileText,
  Clock3,
} from "lucide-react";

interface UserDropdownProps {
  nome: string;
  email: string;
  tipo: "admin" | "medico" | "paciente";
}

export function UserDropdown({ nome, email, tipo }: UserDropdownProps) {
  const router = useRouter();

  // Determinar cor da badge e rótulo baseado no tipo
  const getTipoBadgeClasses = () => {
    switch (tipo) {
      case "admin":
        return "bg-amber-100 text-amber-800";
      case "medico":
        return "bg-blue-100 text-blue-800";
      case "paciente":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTipoLabel = () => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      medico: "Médico",
      paciente: "Paciente",
    };
    return labels[tipo] || tipo.charAt(0).toUpperCase() + tipo.slice(1);
  };

  const getShieldColor = () => {
    switch (tipo) {
      case "admin":
        return "text-amber-600";
      case "medico":
        return "text-blue-600";
      case "paciente":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  const getDisplayName = () => {
    const parts = nome.split(" ");
    if (parts.length === 1) {
      return parts[0];
    }
    // Retorna primeiro e último nome
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="rounded-lg gap-2 px-3 py-2   ">
          <div className="flex items-center justify-center h-8 w-8 rounded-full ">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium hidden sm:block">{getDisplayName()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-3 py-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/20">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3" />
                  {email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Shield className={`h-4 w-4 ${getShieldColor()}`} />
              <span className={`text-xs font-medium px-2 py-1 rounded ${getTipoBadgeClasses()}`}>
                {getTipoLabel()}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tipo === "paciente" && (
          <DropdownMenuItem onClick={() => router.push("/patient/history")} className="cursor-pointer">
            <Clock3 className="mr-2 h-4 w-4" />
            <span>Histórico Clínico</span>
          </DropdownMenuItem>
        )}
        {tipo === "paciente" && (
          <DropdownMenuItem onClick={() => router.push("/patient/results")} className="cursor-pointer">
            <Clock3 className="mr-2 h-4 w-4" />
            <span>Resultados</span>
          </DropdownMenuItem>
        )}
        {tipo === "medico" && (
          <DropdownMenuItem onClick={() => router.push("/doctor/reports")} className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            <span>Relatórios</span>
          </DropdownMenuItem>
        )}
        {(tipo === "paciente" || tipo === "medico") && <DropdownMenuSeparator />}
        <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            router.push("/login");
          }}
          className="text-red-600 cursor-pointer focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair da Conta</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
