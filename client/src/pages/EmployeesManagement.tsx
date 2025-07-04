import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Users, Mail, User, Phone } from "lucide-react";
import { EmployeeWithRelations } from "@shared/schema";

interface EmployeeFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  whatsapp: string;
  roleId: number | null;
  employmentType: "Sócio" | "Funcionário" | "Freelancer";
  avatar: string;
  isActive: boolean;
}

export default function EmployeesManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithRelations | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    whatsapp: "",
    roleId: null,
    employmentType: "Funcionário",
    avatar: "😊",
    isActive: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: roles } = useQuery({
    queryKey: ["/api/roles"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      await apiRequest('POST', '/api/employees', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Sucesso",
        description: "Colaborador criado com sucesso!",
      });
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating employee:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar colaborador",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EmployeeFormData }) => {
      await apiRequest('PUT', `/api/employees/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Sucesso",
        description: "Colaborador atualizado com sucesso!",
      });
      resetForm();
    },
    onError: (error) => {
      console.error("Error updating employee:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar colaborador",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Sucesso",
        description: "Colaborador removido com sucesso!",
      });
    },
    onError: (error) => {
      console.error("Error deleting employee:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover colaborador",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      whatsapp: "",
      roleId: null,
      employmentType: "Funcionário",
      avatar: "😊",
      isActive: true,
    });
    setEditingEmployee(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (employee: EmployeeWithRelations) => {
    setEditingEmployee(employee);
    setFormData({
      email: employee.email || "",
      password: "", // Não preencher senha na edição
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      whatsapp: employee.whatsapp || "",
      roleId: employee.roleId || null,
      employmentType: (employee.employmentType || "Funcionário") as "Sócio" | "Funcionário" | "Freelancer",
      avatar: employee.avatar || "😊",
      isActive: employee.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este colaborador?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Colaboradores</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie funcionários e suas permissões no sistema
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Editar Colaborador" : "Novo Colaborador"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Ex: João"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Ex: Silva"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ex: joao.silva@donjuarez.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="Ex: 33999123456"
                />
              </div>

              <div>
                <Label htmlFor="password">
                  {editingEmployee ? "Nova Senha (deixe em branco para manter)" : "Senha"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Digite a senha"
                  required={!editingEmployee}
                />
              </div>
              
              <div>
                <Label htmlFor="role">Cargo</Label>
                <Select 
                  value={formData.roleId?.toString() || ""} 
                  onValueChange={(value) => setFormData({ ...formData, roleId: value ? parseInt(value) : null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(roles) ? roles : []).map((role: any) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="avatar">Emoji do Colaborador</Label>
                <Select 
                  value={formData.avatar} 
                  onValueChange={(value) => setFormData({ ...formData, avatar: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um emoji" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="😊">😊 Sorridente</SelectItem>
                    <SelectItem value="😎">😎 Legal</SelectItem>
                    <SelectItem value="🤓">🤓 Nerd</SelectItem>
                    <SelectItem value="😄">😄 Feliz</SelectItem>
                    <SelectItem value="🥳">🥳 Festa</SelectItem>
                    <SelectItem value="🤩">🤩 Estrela</SelectItem>
                    <SelectItem value="😇">😇 Anjo</SelectItem>
                    <SelectItem value="🤔">🤔 Pensativo</SelectItem>
                    <SelectItem value="😉">😉 Piscadinha</SelectItem>
                    <SelectItem value="🙂">🙂 Simpático</SelectItem>
                    <SelectItem value="🤗">🤗 Abraço</SelectItem>
                    <SelectItem value="👨‍💼">👨‍💼 Executivo</SelectItem>
                    <SelectItem value="👩‍💼">👩‍💼 Executiva</SelectItem>
                    <SelectItem value="👨‍🍳">👨‍🍳 Chef</SelectItem>
                    <SelectItem value="👩‍🍳">👩‍🍳 Chef</SelectItem>
                    <SelectItem value="🧑‍💻">🧑‍💻 Programador</SelectItem>
                    <SelectItem value="🤵">🤵 Formal</SelectItem>
                    <SelectItem value="👨‍🏫">👨‍🏫 Professor</SelectItem>
                    <SelectItem value="👩‍🏫">👩‍🏫 Professora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="employmentType">Vínculo com a Empresa</Label>
                <Select 
                  value={formData.employmentType} 
                  onValueChange={(value) => setFormData({ ...formData, employmentType: value as "Sócio" | "Funcionário" | "Freelancer" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o vínculo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sócio">Sócio</SelectItem>
                    <SelectItem value="Funcionário">Funcionário</SelectItem>
                    <SelectItem value="Freelancer">Freelancer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <Label htmlFor="isActive">Ativo</Label>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingEmployee ? "Atualizar" : "Criar"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {employeesLoading ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Carregando colaboradores...
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Array.isArray(employees) ? employees : []).map((employee: EmployeeWithRelations) => (
            <Card key={employee.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                      {employee.avatar || "😊"}
                    </div>
                    {employee.firstName} {employee.lastName}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(employee)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(employee.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {employee.email}
                  </div>
                  {employee.whatsapp && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {employee.whatsapp}
                    </div>
                  )}
                  {employee.role && (
                    <Badge variant="secondary">
                      {employee.role.name}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {employee.employmentType || "Funcionário"}
                  </Badge>
                  <Badge variant={employee.isActive ? "default" : "destructive"}>
                    {employee.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}