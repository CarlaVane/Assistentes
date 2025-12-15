"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCircle, Stethoscope, Shield } from "lucide-react";
import { LoadingScreen } from "./loading-screen";
import { loginRequest } from "@/api/requests";

type UserType = "patient" | "doctor" | "admin";

const initialCredentials: Record<UserType, { email: string; password: string }> = {
  patient: { email: "", password: "" },
  doctor: { email: "", password: "" },
  admin: { email: "", password: "" },
};

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [userType, setUserType] = useState<UserType>("patient");
  const [errorMessage, setErrorMessage] = useState("");
  const [credentials, setCredentials] = useState(initialCredentials);

  const currentCredentials = credentials[userType];

  const updateCredential = (field: "email" | "password", value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [userType]: { ...prev[userType], [field]: value },
    }));
    setErrorMessage("");
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const { email, password } = currentCredentials;
    const response = await loginRequest(email, password);

    if (response.status === 200) {
      const { data } = await response.json();

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setErrorMessage("");

      // Redirecionamento baseado no tipo REAL do usuário
      if (data.user.tipo === "paciente") {
        router.push("/patient/symptoms");
      } else if (data.user.tipo === "medico") {
        router.push("/doctor/dashboard");
      } else if (data.user.tipo === "admin") {
        router.push("/admin/dashboard");
      }

      setShowLoadingScreen(true);
      setIsLoading(false);
    } else {
      setErrorMessage("Credenciais inválidas. Tente novamente.");
      setCredentials((prev) => ({
        ...prev,
        [userType]: { email: "", password: "" },
      }));
      setIsLoading(false);
    }
  };

  const handleLoadingComplete = () => {
    router.refresh();
  };

  if (showLoadingScreen) {
    return (
      <LoadingScreen
        userType={userType}
        onLoadComplete={handleLoadingComplete}
      />
    );
  }

  return (
    <Card className="w-full max-w-lg border-0 shadow-2xl">
      <CardHeader className="space-y-3 pb-6">
        <div className="flex justify-center mb-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
        </div>

        <CardTitle className="text-3xl font-bold text-center">
          Medical Assistant
        </CardTitle>

        <CardDescription className="text-center text-base">
          Sistema de Triagem de Sintomas
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-8">
        <Tabs
          defaultValue="patient"
          className="w-full"
          onValueChange={(value) => {
            setUserType(value as UserType);
            setErrorMessage("");
          }}
        >
          <TabsList className="grid w-full grid-cols-3 h-12 mb-6">
            <TabsTrigger value="patient" className="flex items-center gap-2">
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Utente</span>
            </TabsTrigger>

            <TabsTrigger value="doctor" className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              <span className="hidden sm:inline">Médico</span>
            </TabsTrigger>

            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </TabsTrigger>
          </TabsList>

          {/* -------------------------------- Utente -------------------------------- */}
          <TabsContent value="patient">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="patient-email">Email</Label>
                <Input
                  id="patient-email"
                  type="email"
                  placeholder="utente@email.com"
                  required
                  className="h-11"
                  value={currentCredentials.email}
                  onChange={(e) => updateCredential("email", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  required
                  className="h-11"
                  value={currentCredentials.password}
                  onChange={(e) => updateCredential("password", e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isLoading}>
                {isLoading ? "A entrar..." : "Entrar"}
              </Button>

              <p className="text-xs text-center text-red-600">
                {errorMessage}
              </p>
            </form>
          </TabsContent>

          {/* -------------------------------- Médico -------------------------------- */}
          <TabsContent value="doctor">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="medico@email.com"
                  required
                  className="h-11"
                  value={currentCredentials.email}
                  onChange={(e) => updateCredential("email", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  required
                  className="h-11"
                  value={currentCredentials.password}
                  onChange={(e) => updateCredential("password", e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? "A entrar..." : "Entrar"}
              </Button>

              <p className="text-xs text-center text-red-600">
                {errorMessage}
              </p>
            </form>
          </TabsContent>

          {/* -------------------------------- Admin -------------------------------- */}
          <TabsContent value="admin">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="admin@email.com"
                  required
                  className="h-11"
                  value={currentCredentials.email}
                  onChange={(e) => updateCredential("email", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  required
                  className="h-11"
                  value={currentCredentials.password}
                  onChange={(e) => updateCredential("password", e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? "A entrar..." : "Entrar"}
              </Button>

              <p className="text-xs text-center text-red-600">
                {errorMessage}
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
