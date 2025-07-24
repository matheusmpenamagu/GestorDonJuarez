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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Smartphone } from "lucide-react";
import { insertDeviceSchema } from "@shared/schema";
import { z } from "zod";

interface Device {
  id: number;
  code: string;
  name: string;
  description?: string;
  deviceType: string;
  isActive: boolean;
  lastHeartbeat?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DeviceFormData {
  code: string;
  name: string;
  description: string;
  deviceType: string;
  isActive: boolean;
}

// Helper function to check if device is online (heartbeat within last 2 minutes)
function isDeviceOnline(lastHeartbeat: string | null): boolean {
  if (!lastHeartbeat) return false;
  
  const heartbeatTime = new Date(lastHeartbeat).getTime();
  const now = new Date().getTime();
  const twoMinutesMs = 2 * 60 * 1000;
  
  return (now - heartbeatTime) <= twoMinutesMs;
}

export default function DevicesManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState<DeviceFormData>({
    code: "",
    name: "",
    description: "",
    deviceType: "Fluxo",
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
      return await apiRequest("POST", "/api/devices", data);
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
      console.error("Erro ao criar dispositivo:", error);
      toast({
        title: "Erro ao criar dispositivo",
        description: error.message || "Ocorreu um erro ao criar o dispositivo.",
        variant: "destructive",
      });
    },
  });

  // Update device mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DeviceFormData }) => {
      return await apiRequest("PUT", `/api/devices/${id}`, data);
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
      console.error("Erro ao atualizar dispositivo:", error);
      toast({
        title: "Erro ao atualizar dispositivo",
        description: error.message || "Ocorreu um erro ao atualizar o dispositivo.",
        variant: "destructive",
      });
    },
  });

  // Delete device mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/devices/${id}`);
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
      deviceType: "Fluxo",
      isActive: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Submitting form data:", formData);
    console.log("Editing device:", editingDevice);
    
    // Validate form data
    try {
      const validatedData = insertDeviceSchema.parse(formData);
      console.log("Validated data:", validatedData);
      
      if (editingDevice) {
        console.log("Updating device with ID:", editingDevice.id);
        updateMutation.mutate({ id: editingDevice.id, data: formData });
      } else {
        console.log("Creating new device");
        createMutation.mutate(formData);
      }
    } catch (error) {
      console.error("Validation error:", error);
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
      deviceType: device.deviceType || "Fluxo",
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
                {/* Device heartbeat status indicator */}
                <div 
                  className={`w-2.5 h-2.5 rounded-full ${
                    isDeviceOnline(device.lastHeartbeat || null) 
                      ? 'bg-green-500 animate-pulse' 
                      : 'bg-red-500'
                  }`} 
                  title={`Dispositivo ${isDeviceOnline(device.lastHeartbeat || null) ? 'online' : 'offline'}`}
                />
              </div>
              <Badge variant={device.isActive ? "default" : "secondary"}>
                {device.isActive ? "Ativo" : "Inativo"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{device.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {device.deviceType}
                  </Badge>
                </div>
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

            <div className="space-y-2">
              <Label htmlFor="deviceType">Tipo de Dispositivo</Label>
              <Select
                value={formData.deviceType}
                onValueChange={(value) => setFormData({ ...formData, deviceType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fluxo">Fluxo</SelectItem>
                  <SelectItem value="Tela">Tela</SelectItem>
                  <SelectItem value="Temperatura">Temperatura</SelectItem>
                </SelectContent>
              </Select>
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