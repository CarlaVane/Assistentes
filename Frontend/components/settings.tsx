"use client";

import type React from "react"
import { useState } from "react"
import { Stethoscope, Lock, Check, X, User, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { changePasswordRequest, updateUserRequest } from "@/api/requests/users"
import { UserDropdown } from "@/components/user-dropdown"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function Settings() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [passwordsMatch, setPasswordsMatch] = useState(false)
  const [userInfo, setUserInfo] = useState<{ nome: string; email: string; tipo: string }>({ nome: "Utilizador", email: "", tipo: "admin" })

  const [passwordForm, setPasswordForm] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  })

  const [profileForm, setProfileForm] = useState({
    nome: "",
    email: "",
  })

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    if (user && user.nome) {
      setUserInfo({
        nome: user.nome,
        email: user.email || "",
        tipo: user.tipo || "admin",
      })
      setProfileForm({
        nome: user.nome,
        email: user.email || "",
      })
    }
  }, [])

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (name === "confirmarSenha" || name === "novaSenha") {
      setPasswordsMatch(
        passwordForm.novaSenha === value || (name === "novaSenha" && value === passwordForm.confirmarSenha),
      )
    }
  }

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordForm.senhaAtual) {
      toast.error("Digite a senha atual")
      return
    }

    if (!passwordForm.novaSenha) {
      toast.error("Digite a nova senha")
      return
    }

    if (!passwordForm.confirmarSenha) {
      toast.error("Confirme a nova senha")
      return
    }

    if (passwordForm.novaSenha !== passwordForm.confirmarSenha) {
      toast.error("As senhas não correspondem")
      return
    }

    if (passwordForm.novaSenha.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres")
      return
    }

    setIsLoading(true)

    try {
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      if (!token || !user.id) {
        toast.error("Sessão expirada. Por favor, faça login novamente.")
        return
      }

      const response = await changePasswordRequest(user.id, passwordForm.senhaAtual, passwordForm.novaSenha, token)

      if (response.ok) {
        toast.success("Senha alterada com sucesso!")
        setPasswordForm({
          senhaAtual: "",
          novaSenha: "",
          confirmarSenha: "",
        })
      } else {
        const error = await response.json().catch(() => ({ message: "Erro ao alterar a senha" }))
        toast.error(error.message || "Erro ao alterar a senha")
      }
    } catch (err) {
      console.error("Erro ao alterar senha:", err)
      toast.error("Erro ao alterar a senha")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profileForm.nome || !profileForm.email) {
      toast.error("Nome e email são obrigatórios")
      return
    }

    setIsLoading(true)

    try {
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      if (!token || !user.id) {
        toast.error("Sessão expirada. Por favor, faça login novamente.")
        return
      }

      const response = await updateUserRequest(user.id, {
        nome: profileForm.nome,
        email: profileForm.email,
      }, token)

      if (response.ok) {
        toast.success("Perfil atualizado com sucesso!")
        
        // Atualizar localStorage
        const updatedUser = { ...user, nome: profileForm.nome, email: profileForm.email }
        localStorage.setItem("user", JSON.stringify(updatedUser))
        setUserInfo(updatedUser)
      } else {
        const error = await response.json().catch(() => ({ message: "Erro ao atualizar perfil" }))
        toast.error(error.message || "Erro ao atualizar perfil")
      }
    } catch (err) {
      console.error("Erro ao atualizar perfil:", err)
      toast.error("Erro ao atualizar perfil")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const user = JSON.parse(localStorage.getItem("user") || "{}")
              const dashboardPath = user.tipo === "admin" ? "/admin/dashboard" : user.tipo === "medico" ? "/doctor/dashboard" : "/patient/symptoms"
              // Marcar que é uma navegação de retorno (sem LoadingScreen)
              sessionStorage.setItem("skipLoadingScreen", "true")
              router.push(dashboardPath)
            }}
            className="rounded-lg mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Stethoscope className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-semibold">Medical Assistant</h1>
        </div>
        <UserDropdown nome={userInfo.nome} email={userInfo.email} tipo={userInfo.tipo as "admin" | "medico" | "paciente"} />
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* EDITAR PERFIL */}
        <Card className="border border-border shadow-lg">
          <CardHeader className="border-b bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-foreground">Editar Perfil</CardTitle>
                <CardDescription>Atualize suas informações pessoais</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleEditProfile} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="nome" className="text-sm font-medium text-foreground">
                  Nome Completo
                </Label>
                <Input
                  id="nome"
                  name="nome"
                  type="text"
                  placeholder="Digite seu nome completo"
                  value={profileForm.nome}
                  onChange={handleProfileChange}
                  className="border border-input bg-card text-foreground"
                />
                <p className="text-xs text-muted-foreground">Seu nome completo</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Digite seu email"
                  value={profileForm.email}
                  onChange={handleProfileChange}
                  className="border border-input bg-card text-foreground"
                />
                <p className="text-xs text-muted-foreground">Seu endereço de email</p>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !profileForm.nome || !profileForm.email}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                size="lg"
              >
                {isLoading ? "Guardando..." : "Guardar Alterações"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ALTERAR SENHA */}
        <Card className="border border-border shadow-lg">
          <CardHeader className="border-b bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-foreground">Alterar Senha</CardTitle>
                <CardDescription>Atualize sua senha para manter sua conta segura</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="senhaAtual" className="text-sm font-medium text-foreground">
                  Senha Atual
                </Label>
                <Input
                  id="senhaAtual"
                  name="senhaAtual"
                  type="password"
                  placeholder="Digite sua senha atual"
                  value={passwordForm.senhaAtual}
                  onChange={handlePasswordChange}
                  disabled={isLoading}
                  className="border border-input bg-card text-foreground"
                />
                <p className="text-xs text-muted-foreground">Digite sua senha atual para confirmar</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="novaSenha" className="text-sm font-medium text-foreground">
                  Nova Senha
                </Label>
                <Input
                  id="novaSenha"
                  name="novaSenha"
                  type="password"
                  placeholder="Digite sua nova senha"
                  value={passwordForm.novaSenha}
                  onChange={handlePasswordChange}
                  disabled={isLoading}
                  className="border border-input bg-card text-foreground"
                />
                <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="confirmarSenha" className="text-sm font-medium text-foreground">
                  Confirmar Nova Senha
                </Label>
                <div className="relative">
                  <Input
                    id="confirmarSenha"
                    name="confirmarSenha"
                    type="password"
                    placeholder="Confirme sua nova senha"
                    value={passwordForm.confirmarSenha}
                    onChange={handlePasswordChange}
                    disabled={isLoading}
                    className={`border bg-card text-foreground ${
                      passwordForm.confirmarSenha
                        ? passwordsMatch
                          ? "border-accent"
                          : "border-destructive"
                        : "border-input"
                    }`}
                  />
                  {passwordForm.confirmarSenha && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {passwordsMatch ? (
                        <Check className="h-5 w-5 text-accent" />
                      ) : (
                        <X className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {passwordForm.confirmarSenha && !passwordsMatch && (
                <Alert className="bg-destructive/10 border-destructive/30">
                  <AlertDescription className="text-destructive text-sm">As senhas não correspondem</AlertDescription>
                </Alert>
              )}

              {passwordForm.confirmarSenha && passwordsMatch && (
                <Alert className="bg-accent/10 border-accent/30">
                  <AlertDescription className="text-accent text-sm">As senhas correspondem</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isLoading || !passwordForm.senhaAtual || !passwordForm.novaSenha || !passwordsMatch}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                size="lg"
              >
                {isLoading ? "Alterando..." : "Alterar Senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
