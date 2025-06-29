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
import { Plus, Edit, Trash2 } from "lucide-react";

interface TapFormData {
  name: string;
  posId: number | null;
  currentBeerStyleId: number | null;
  deviceId: number | null;
  kegCapacityMl: number;
}

export default function TapsManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTap, setEditingTap] = useState<any>(null);
  const [formData, setFormData] = useState<TapFormData>({
    name: "",
    posId: null,
    currentBeerStyleId: null,
    deviceId: null,
    kegCapacityMl: 30000,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: taps, isLoading: tapsLoading } = useQuery({
    queryKey: ["/api/taps"],
  });

  const { data: pointsOfSale } = useQuery({
    queryKey: ["/api/points-of-sale"],
  });

  const { data: beerStyles } = useQuery({
    queryKey: ["/api/beer-styles"],
  });

  const { data: devices } = useQuery({
    queryKey: ["/api/devices"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: TapFormData) => {
      await apiRequest("POST", "/api/taps", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taps"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Torneira criada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar torneira",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TapFormData> }) => {
      await apiRequest("PUT", `/api/taps/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taps"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Torneira atualizada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar torneira",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/taps/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taps"] });
      toast({
        title: "Sucesso",
        description: "Torneira removida com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao remover torneira",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      posId: null,
      currentBeerStyleId: null,
      deviceId: null,
      kegCapacityMl: 30000,
    });
    setEditingTap(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTap) {
      updateMutation.mutate({ id: editingTap.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (tap: any) => {
    setEditingTap(tap);
    setFormData({
      name: tap.name || "",
      posId: tap.posId || null,
      currentBeerStyleId: tap.currentBeerStyleId || null,
      deviceId: tap.deviceId || null,
      kegCapacityMl: tap.kegCapacityMl || 30000,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta torneira?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Torneiras</h2>
          <p className="text-muted-foreground mt-1">
            Configure e monitore as torneiras do sistema
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Torneira
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTap ? "Editar Torneira" : "Nova Torneira"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Torneira 1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="pos">Ponto de Venda</Label>
                <Select 
                  value={formData.posId?.toString() || ""} 
                  onValueChange={(value) => setFormData({ ...formData, posId: value ? parseInt(value) : null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um ponto de venda" />
                  </SelectTrigger>
                  <SelectContent>
                    {pointsOfSale?.map((pos: any) => (
                      <SelectItem key={pos.id} value={pos.id.toString()}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="beerStyle">Estilo de Cerveja</Label>
                <Select 
                  value={formData.currentBeerStyleId?.toString() || ""} 
                  onValueChange={(value) => setFormData({ ...formData, currentBeerStyleId: value ? parseInt(value) : null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um estilo de cerveja" />
                  </SelectTrigger>
                  <SelectContent>
                    {beerStyles?.map((style: any) => (
                      <SelectItem key={style.id} value={style.id.toString()}>
                        {style.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="capacity">Capacidade do Barril (ml)</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.kegCapacityMl}
                  onChange={(e) => setFormData({ ...formData, kegCapacityMl: parseInt(e.target.value) })}
                  min="1000"
                  step="1000"
                  required
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingTap ? "Atualizar" : "Criar"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent>
          {tapsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando torneiras...
            </div>
          ) : !taps || taps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma torneira configurada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">ID</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Nome</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Ponto de Venda</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Estilo</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {taps.map((tap: any) => (
                    <tr key={tap.id} className="hover:bg-muted/50">
                      <td className="py-4 text-sm font-medium text-foreground">{tap.id}</td>
                      <td className="py-4 text-sm text-foreground">{tap.name}</td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {tap.pointOfSale?.name || "N/A"}
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {tap.currentBeerStyle?.name || "N/A"}
                      </td>
                      <td className="py-4">
                        <Badge variant={tap.isActive ? "default" : "secondary"}>
                          {tap.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(tap)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(tap.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
