import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Beer, MoreVertical, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface BeerStyleFormData {
  name: string;
  description: string;
}

const colorClasses = [
  "bg-amber-500",
  "bg-yellow-500", 
  "bg-orange-500",
  "bg-red-500",
  "bg-purple-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-pink-500",
];

export default function BeerStylesManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<any>(null);
  const [formData, setFormData] = useState<BeerStyleFormData>({
    name: "",
    description: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: beerStyles, isLoading } = useQuery({
    queryKey: ["/api/beer-styles"],
  });

  const { data: taps } = useQuery({
    queryKey: ["/api/taps"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: BeerStyleFormData) => {
      await apiRequest("POST", "/api/beer-styles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beer-styles"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Estilo de cerveja criado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar estilo de cerveja",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BeerStyleFormData> }) => {
      await apiRequest("PUT", `/api/beer-styles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beer-styles"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Estilo de cerveja atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar estilo de cerveja",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/beer-styles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beer-styles"] });
      toast({
        title: "Sucesso",
        description: "Estilo de cerveja removido com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao remover estilo de cerveja",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
    });
    setEditingStyle(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingStyle) {
      updateMutation.mutate({ id: editingStyle.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (style: any) => {
    setEditingStyle(style);
    setFormData({
      name: style.name || "",
      description: style.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este estilo de cerveja?")) {
      deleteMutation.mutate(id);
    }
  };

  const getTapsUsingStyle = (styleId: number) => {
    if (!taps) return 0;
    return taps.filter((tap: any) => tap.currentBeerStyleId === styleId && tap.isActive).length;
  };

  const getColorClass = (index: number) => {
    return colorClasses[index % colorClasses.length];
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Estilos de Cerveja</h2>
          <p className="text-muted-foreground mt-1">
            Cadastre e gerencie os estilos disponíveis
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Estilo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStyle ? "Editar Estilo de Cerveja" : "Novo Estilo de Cerveja"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: IPA Artesanal"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Cerveja lupulada com amargor característico e aroma cítrico"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingStyle ? "Atualizar" : "Criar"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando estilos de cerveja...
        </div>
      ) : !beerStyles || beerStyles.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhum estilo de cerveja configurado
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {beerStyles.map((style: any, index: number) => (
            <Card key={style.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getColorClass(index)}`}>
                      <Beer className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{style.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">ID: {style.id}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleEdit(style)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(style.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {style.description && (
                  <p className="text-sm text-muted-foreground mb-4">{style.description}</p>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Em uso:</span>
                  <span className="font-medium text-green-600">
                    {getTapsUsingStyle(style.id)} torneiras
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
