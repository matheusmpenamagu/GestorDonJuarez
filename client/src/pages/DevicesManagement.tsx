import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Smartphone } from "lucide-react";
import { insertDeviceSchema } from "@shared/schema";
import { z } from "zod";

interface Device {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DeviceFormData {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
}

export default function DevicesManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState<DeviceFormData>({
    code: "",
    name: "",
    description: "",
    isActive: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all devices
  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  // Create device mutation
  const createMutation = useMutation({
    mutationFn: async (data: DeviceFormData) => {
      return await apiRequest("/api/devices", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Dispositivo criado",
        description: "O dispositivo foi criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar dispositivo",
        description: "Ocorreu um erro ao criar o dispositivo.",
        variant: "destructive",
      });
    },
  });

  // Update device mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DeviceFormData }) => {
      return await apiRequest(`/api/devices/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      setIsDialogOpen(false);
      setEditingDevice(null);
      resetForm();
      toast({
        title: "Dispositivo atualizado",
        description: "O dispositivo foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar dispositivo",
        description: "Ocorreu um erro ao atualizar o dispositivo.",
        variant: "destructive",
      });
    },
  });

  // Delete device mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/devices/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({
        title: "Dispositivo excluído",
        description: "O dispositivo foi excluído com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir dispositivo",
        description: "Ocorreu um erro ao excluir o dispositivo.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      isActive: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    try {
      insertDeviceSchema.parse(formData);
      
      if (editingDevice) {
        updateMutation.mutate({ id: editingDevice.id, data: formData });
      } else {
        createMutation.mutate(formData);
      }
    } catch (error) {
      toast({
        title: "Erro de validação",
        description: "Por favor, verifique os dados informados.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      code: device.code,
      name: device.name,
      description: device.description || "",
      isActive: device.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este dispositivo?")) {
      deleteMutation.mutate(id);
    }
  };

  const openCreateDialog = () => {
    setEditingDevice(null);
    resetForm();
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dispositivos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento de Dispositivos</h1>
          <p className="text-muted-foreground">
            Gerencie os dispositivos ESP32 conectados ao sistema
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Dispositivo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {devices.map((device) => (
          <Card key={device.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-medium">{device.code}</CardTitle>
              </div>
              <Badge variant={device.isActive ? "default" : "secondary"}>
                {device.isActive ? "Ativo" : "Inativo"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h3 className="font-semibold">{device.name}</h3>
                {device.description && (
                  <p className="text-sm text-muted-foreground">{device.description}</p>
                )}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-muted-foreground">
                    Criado em {new Date(device.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(device)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(device.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {devices.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum dispositivo encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece adicionando seu primeiro dispositivo ESP32
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Dispositivo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDevice ? "Editar Dispositivo" : "Novo Dispositivo"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código (5 dígitos)</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="ESP01"
                maxLength={5}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Sensor Torneira 1"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do dispositivo e sua localização"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Dispositivo ativo</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Salvando..."
                  : editingDevice
                  ? "Atualizar"
                  : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}