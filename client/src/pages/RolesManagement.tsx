import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, UserCog, Shield, Check, X } from "lucide-react";
import { Role } from "@shared/schema";

interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
}

// Lista de permissões disponíveis baseadas nos submenus
const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', name: 'Dashboard', description: 'Visualizar dashboard principal' },
  { id: 'history', name: 'Histórico', description: 'Acessar histórico de eventos' },
  { id: 'taps', name: 'Torneiras', description: 'Gerenciar torneiras' },
  { id: 'pos', name: 'Pontos de Venda', description: 'Gerenciar pontos de venda' },
  { id: 'beer_styles', name: 'Estilos de Chopes', description: 'Gerenciar estilos de cerveja' },
  { id: 'devices', name: 'Dispositivos', description: 'Gerenciar dispositivos ESP32' },
  { id: 'employees', name: 'Colaboradores', description: 'Gerenciar funcionários' },
  { id: 'roles', name: 'Cargos', description: 'Gerenciar cargos e permissões' },
  { id: 'freelancer_tracking', name: 'Controle de Ponto', description: 'Acessar controle de ponto de freelancers' },
  { id: 'products', name: 'Produtos', description: 'Gerenciar produtos e catálogo' },
  { id: 'stock_counts', name: 'Contagens de Estoque', description: 'Criar e gerenciar contagens de estoque' },
  { id: 'co2_management', name: 'Gestão de CO2', description: 'Gerenciar recargas e retiradas de CO2' },
];

export default function RolesManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    description: "",
    permissions: [],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/roles"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      await apiRequest('POST', '/api/roles', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Sucesso",
        description: "Cargo criado com sucesso!",
      });
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating role:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar cargo",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: RoleFormData }) => {
      await apiRequest('PUT', `/api/roles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Sucesso",
        description: "Cargo atualizado com sucesso!",
      });
      resetForm();
    },
    onError: (error) => {
      console.error("Error updating role:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar cargo",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Sucesso",
        description: "Cargo removido com sucesso!",
      });
    },
    onError: (error) => {
      console.error("Error deleting role:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover cargo",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      permissions: [],
    });
    setEditingRole(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name || "",
      description: role.description || "",
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este cargo?")) {
      deleteMutation.mutate(id);
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const getPermissionName = (permissionId: string) => {
    const permission = AVAILABLE_PERMISSIONS.find(p => p.id === permissionId);
    return permission ? permission.name : permissionId;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Cargos</h2>
          <p className="text-muted-foreground mt-1">
            Configure cargos e suas permissões de acesso no sistema
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cargo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRole ? "Editar Cargo" : "Novo Cargo"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Cargo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Gerente, Atendente, Administrador"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva as responsabilidades deste cargo"
                  rows={3}
                />
              </div>

              <div>
                <Label>Permissões</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {AVAILABLE_PERMISSIONS.map((permission) => (
                    <div
                      key={permission.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        formData.permissions.includes(permission.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => togglePermission(permission.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{permission.name}</div>
                          <div className="text-xs text-muted-foreground">{permission.description}</div>
                        </div>
                        {formData.permissions.includes(permission.id) ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingRole ? "Atualizar" : "Criar"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {rolesLoading ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Carregando cargos...
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Array.isArray(roles) ? roles : []).map((role: Role) => (
            <Card key={role.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCog className="h-5 w-5" />
                    {role.name}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(role)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(role.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {role.description && (
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  )}
                  
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">Permissões:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(role.permissions) && role.permissions.length > 0 ? (
                        role.permissions.map((permission) => (
                          <Badge key={permission} variant="secondary" className="text-xs">
                            {getPermissionName(permission)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Nenhuma permissão</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}