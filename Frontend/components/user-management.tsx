"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"

import { 
  listUsersRequest, 
  createUserRequest,
  updateUserRequest,
  deleteUserRequest,
  createPacienteRequest,
  listDoencasRequest,
} from "@/api/requests";

import { ArrowLeft, Plus, Search, Edit, Trash2, X } from "lucide-react"
import { toast } from "sonner"

export function UserManagement() {
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [users, setUsers] = useState<any[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estado do formulário
  const [editingUserId, setEditingUserId] = useState<string | null>(null)

  type UserTipo = "" | "paciente" | "medico" | "admin"

  const [form, setForm] = useState<{
    nome: string
    email: string
    password: string
    tipo: UserTipo
    numeroProcesso: string
    especialidade: string
    // Patient fields
    data_nascimento?: string
    genero?: "M" | "F" | ""
    altura?: string
    peso?: string
    contacto?: string
    endereco?: string
    numero_seguranca_social?: string
    documento?: string
    numero_identificacao?: string
    documento_identificacao_tipo?: "BI" | "CC" | "Passaporte" | ""
    predisposicoes?: string
  }>({
    nome: "",
    email: "",
    password: "",
    tipo: "",
    // Campos específicos:
    numeroProcesso: "",
    especialidade: "",
    data_nascimento: "",
    genero: "",
    altura: "",
    peso: "",
    contacto: "",
    endereco: "",
    numero_seguranca_social: "",
    documento: "",
    numero_identificacao: "",
    documento_identificacao_tipo: "",
    predisposicoes: "",
  })

  // BUSCAR USERS
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await listUsersRequest(token || "")

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        setError(payload?.message || "Erro ao obter utilizadores")
        return
      }

      const payload = await res.json()
      setUsers(payload?.data || [])
    } catch (e) {
      setError("Erro de rede")
    } finally {
      setLoading(false)
    }
  }

  // ABRIR O MODAL PARA CRIAR
  const handleOpenCreate = () => {
    setEditingUserId(null)
    setForm({
      nome: "",
      email: "",
      password: "",
      tipo: "",
      numeroProcesso: "",
      especialidade: "",
      data_nascimento: "",
      genero: "",
      altura: "",
      peso: "",
      contacto: "",
      endereco: "",
      numero_seguranca_social: "",
      documento: "",
      numero_identificacao: "",
      documento_identificacao_tipo: "",
      predisposicoes: "",
    })
    setIsDialogOpen(true)
  }

  // ABRIR MODAL PARA EDITAR
  const handleOpenEdit = (id: string) => {
    const user = users.find((u) => u._id === id)

    if (!user) return

    setEditingUserId(id)
    setForm({
      nome: user.nome,
      email: user.email,
      password: "",
      tipo: user.tipo,
      numeroProcesso: user.numeroProcesso || "",
      especialidade: user.especialidade || "",
      data_nascimento: "",
      genero: "",
      altura: "",
      peso: "",
      contacto: "",
      endereco: "",
      numero_seguranca_social: "",
      documento: user.documento || "",
      numero_identificacao: user.documento || "",
      documento_identificacao_tipo: user.documento_identificacao_tipo || "",
      predisposicoes: "",
    })

    setIsDialogOpen(true)
  }

  // SUBMETER FORMULÁRIO
  const handleSubmit = async () => {
    const token = localStorage.getItem("token")

    const body = { ...form }
    if (!editingUserId && !body.password) {
      toast.error("A password é obrigatória para criar um utilizador")
      return
    }

    if (!body.tipo) {
      toast.error("O perfil (tipo) é obrigatório")
      return
    }

    try {
      let res
      if (editingUserId) {
        // don't send empty password on update (backend requires password field otherwise)
        if (!body.password || (typeof body.password === 'string' && body.password.trim() === "")) {
          delete (body as any).password
        }
        res = await updateUserRequest(editingUserId, body as any, token || undefined)
      } else {
        res = await createUserRequest(body as any, token || undefined)
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        toast.error(payload?.message || `Erro: ${res.status}`)
        return
      }

      // sucesso
      const successMsg = editingUserId ? "Utilizador atualizado com sucesso" : "Utilizador criado com sucesso"
      toast.success(successMsg)
      setIsDialogOpen(false)
      setEditingUserId(null)

      // If we just created a paciente user, attempt to create the paciente profile (admin flow)
      if (!editingUserId && body.tipo === 'paciente') {
        try {
          const payload = await res.json().catch(() => null)
          const createdUser = payload?.data
          if (createdUser && (createdUser._id || createdUser.id)) {
            const userId = createdUser._id || createdUser.id
            let predisposicoesIds: string[] | undefined = undefined;
            if (form.predisposicoes) {
              try {
                const names = form.predisposicoes.split(',').map(s => s.trim()).filter(Boolean);
                if (names.length > 0) {
                  const dRes = await listDoencasRequest();
                  if (dRes.ok) {
                    const dPayload = await dRes.json().catch(() => null);
                    const allDoencas = dPayload?.data || [];
                    // map names (case-insensitive) to IDs
                    const ids = names.map((name: string) => {
                      const found = allDoencas.find((d: any) => String(d.nome).toLowerCase() === String(name).toLowerCase());
                      return found ? found._id : null;
                    }).filter((x: any) => x);
                    if (ids.length > 0) predisposicoesIds = ids;
                    else {
                      // no matches — warn
                      toast.warning('Nenhuma predisposição correspondeu aos nomes informados; será enviada vazia.');
                    }
                  } else {
                    toast.warning('Não foi possível obter lista de doenças para mapear predisposições.');
                  }
                }
              } catch (err) {
                console.error('Erro ao mapear predisposicoes:', err);
              }
            }

            const pacienteBody: any = {
              nome: form.nome,
              // backend expects 'documento' field for identification number
              documento: form.numero_identificacao || form.documento || undefined,
              peso: form.peso ? Number(form.peso) : undefined,
              altura: form.altura ? Number(form.altura) : undefined,
              data_nascimento: form.data_nascimento || undefined,
              genero: form.genero || undefined,
              contacto: form.contacto || undefined,
              endereco: form.endereco || undefined,
              numero_seguranca_social: form.numero_seguranca_social || undefined,
              predisposicoes: predisposicoesIds,
              user: userId,
            }

            const pacienteRes = await createPacienteRequest(token || "", pacienteBody)
            if (!pacienteRes.ok) {
              const pErr = await pacienteRes.json().catch(() => null)
              toast.warning(`Utilizador criado, mas não foi possível criar o perfil do paciente: ${pErr?.message || pacienteRes.status}`)
            } else {
              toast.success("Perfil de paciente criado com sucesso")
            }
          }
        } catch (err) {
          console.error("Erro ao criar paciente após criação do user:", err)
        }
      }

      fetchUsers()
    } catch (e) {
      console.error(e)
      toast.error("Erro de rede ao submeter o formulário")
    }
  }

  // APAGAR UTILIZADOR
  // confirmação via modal
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<{ id: string; nome?: string } | null>(null)

  const openDeleteDialog = (id: string, nome?: string) => {
    setUserToDelete({ id, nome })
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteUser = async (id: string) => {
    const token = localStorage.getItem("token")
    try {
      const res = await deleteUserRequest(id, token || undefined)
      if (res.status === 204) {
        // removido com sucesso
        setUsers((prev) => prev.filter((u) => u._id !== id))
        toast.success("Utilizador apagado com sucesso")
      } else {
        const payload = await res.json().catch(() => null)
        toast.error(payload?.message || `Erro ao apagar: ${res.status}`)
      }
    } catch (e) {
      console.error(e)
      toast.error("Erro de rede ao apagar utilizador")
    } finally {
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6">
      <Button variant="ghost" className="mb-4" onClick={() => router.push("/admin/dashboard")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar ao Dashboard
      </Button>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Utilizadores</h1>
          <p className="text-muted-foreground">Registe, edite e remova utilizadores</p>
        </div>

        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Utilizador
        </Button>
      </div>

      {/* DRAWER */}
      <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen} direction="right">
        <DrawerContent className="w-full sm:w-[600px] h-screen rounded-0">
          <DrawerHeader className="text-left border-b">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>
                  {editingUserId ? "Editar Utilizador" : "Criar Novo Utilizador"}
                </DrawerTitle>
                <DrawerDescription>
                  Preencha os dados abaixo
                </DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="overflow-y-auto flex-1 px-4 py-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Nome Completo</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Digite o nome"
                />
              </div>

              <div className="space-y-3">
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  type="email"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-3">
                <Label>Perfil</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm({ ...form, tipo: v as UserTipo })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paciente">Paciente</SelectItem>
                    <SelectItem value="medico">Médico</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CAMPOS DINÂMICOS */}
              {form.tipo === "paciente" && (
                <div className="space-y-3">
                  <Label>Número de Processo</Label>
                  <Input
                  value={form.numeroProcesso}
                  onChange={(e) => setForm({ ...form, numeroProcesso: e.target.value })}
                  placeholder="Ex: 12345"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div className="space-y-2">
                    <Label>Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={form.data_nascimento}
                      onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Gênero</Label>
                    <Select
                      value={form.genero as any}
                      onValueChange={(v) => setForm({ ...form, genero: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Altura (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.altura}
                      onChange={(e) => setForm({ ...form, altura: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Peso (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={form.peso}
                      onChange={(e) => setForm({ ...form, peso: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contacto</Label>
                    <Input
                      value={form.contacto}
                      onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-2">
                  <Label>Endereço</Label>
                  <Input
                    value={form.endereco}
                    onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div className="space-y-2">
                    <Label>Número Segurança Social</Label>
                    <Input
                      value={form.numero_seguranca_social}
                      onChange={(e) => setForm({ ...form, numero_seguranca_social: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                      <Label>Número de Identificação</Label>
                      <Input
                        value={form.numero_identificacao}
                        onChange={(e) => setForm({ ...form, numero_identificacao: e.target.value })}
                        placeholder="Ex: AB123456 (BI/CC/Passaporte)"
                      />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div className="space-y-2">
                    <Label>Tipo de Documento</Label>
                    <Select
                      value={form.documento_identificacao_tipo as any}
                      onValueChange={(v) => setForm({ ...form, documento_identificacao_tipo: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BI">BI</SelectItem>
                        <SelectItem value="CC">CC</SelectItem>
                        <SelectItem value="Passaporte">Passaporte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Predisposições (separar por vírgula)</Label>
                    <Input
                      value={form.predisposicoes}
                      onChange={(e) => setForm({ ...form, predisposicoes: e.target.value })}
                      placeholder="Ex: Diabetes, Hipertensão"
                    />
                  </div>
                </div>
              </div>
            )}

            {form.tipo === "medico" && (
              <div className="space-y-3">
                <Label>Especialidade</Label>
                <Input
                  value={form.especialidade}
                  onChange={(e) => setForm({ ...form, especialidade: e.target.value })}
                  placeholder="Ex: Cardiologia"
                />
              </div>
            )}

            {!editingUserId && (
              <div className="space-y-3">
                <Label>Password Inicial</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Digite a senha"
                />
              </div>
            )}

            <Button className="w-full" onClick={handleSubmit}>
              {editingUserId ? "Atualizar" : "Criar Utilizador"}
            </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* CAMPO DE BUSCA */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar utilizador por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* LISTA DE USERS */}
      <Card>
        <CardHeader>
          <CardTitle>Utilizadores Registados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : users.length === 0 ? (
            <p>Nenhum utilizador encontrado.</p>
          ) : (
            users.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between p-4 border rounded-lg mb-2"
              >
                <div>
                  <p className="font-medium">{user.nome}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline">{user.tipo}</Badge>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenEdit(user._id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteUser(user._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
