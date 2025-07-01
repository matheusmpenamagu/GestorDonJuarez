import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Beer, MoreVertical, Edit, Trash2, Palette } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface BeerStyleFormData {
  name: string;
  description: string;
  ebcColor: number | null;
}

// EBC Color Scale: European Brewery Convention color mapping
const ebcColors = [
  { value: 2, name: "Palha", color: "#FFE699", description: "Cerveja muito clara, cor de palha" },
  { value: 4, name: "Amarelo claro", color: "#FFD700", description: "Cor dourada clara" },
  { value: 6, name: "Dourado", color: "#DAA520", description: "Dourado típico de lagers" },
  { value: 8, name: "Âmbar claro", color: "#CD853F", description: "Âmbar claro, ales douradas" },
  { value: 12, name: "Âmbar", color: "#B8860B", description: "Âmbar médio, IPAs e ales" },
  { value: 16, name: "Cobre", color: "#B87333", description: "Cor de cobre, brown ales" },
  { value: 20, name: "Marrom claro", color: "#8B4513", description: "Marrom claro, porters" },
  { value: 30, name: "Marrom", color: "#654321", description: "Marrom escuro, stouts" },
  { value: 40, name: "Marrom escuro", color: "#3C2415", description: "Muito escuro, imperial stouts" },
  { value: 80, name: "Preto", color: "#1C1C1C", description: "Preto opaco, stouts robustos" },
];

const getEbcColorStyle = (ebcValue: number | null) => {
  if (!ebcValue) return { backgroundColor: "#f3f4f6" };
  
  const colorRange = ebcColors.find((color, index) => {
    const nextColor = ebcColors[index + 1];
    return ebcValue <= color.value || !nextColor;
  });
  
  return { backgroundColor: colorRange?.color || "#f3f4f6" };
};

const getEbcColorName = (ebcValue: number | null) => {
  if (!ebcValue) return "Não definido";
  
  const colorRange = ebcColors.find((color, index) => {
    const nextColor = ebcColors[index + 1];
    return ebcValue <= color.value || !nextColor;
  });
  
  return colorRange?.name || "Personalizado";
};

export default function BeerStylesManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<any>(null);
  const [formData, setFormData] = useState<BeerStyleFormData>({
    name: "",
    description: "",
    ebcColor: null,
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
      ebcColor: null,
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
      ebcColor: style.ebcColor || null,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este estilo de cerveja?")) {
      deleteMutation.mutate(id);
    }
  };

  const getTapsUsingStyle = (styleId: number) => {
    if (!taps || !Array.isArray(taps)) return 0;
    return taps.filter((tap: any) => tap.currentBeerStyleId === styleId && tap.isActive).length;
  };

  return (
    <div className="space-y-6">
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

              <div>
                <Label htmlFor="ebcColor">Cor EBC (European Brewery Convention)</Label>
                <Select 
                  value={formData.ebcColor?.toString() || ""} 
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    ebcColor: value ? parseInt(value) : null 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a cor do estilo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não definido</SelectItem>
                    {ebcColors.map((color) => (
                      <SelectItem key={color.value} value={color.value.toString()}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: color.color }}
                          />
                          <span>{color.name} (EBC {color.value})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.ebcColor && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {ebcColors.find(c => c.value === formData.ebcColor)?.description}
                  </p>
                )}
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
      ) : !beerStyles || !Array.isArray(beerStyles) || beerStyles.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhum estilo de cerveja configurado
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(beerStyles) && beerStyles.map((style: any) => (
            <Card key={style.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center border" 
                      style={getEbcColorStyle(style.ebcColor)}
                    >
                      <Beer className="h-5 w-5" style={{ color: style.ebcColor && style.ebcColor > 20 ? 'white' : 'black' }} />
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
                
                {style.ebcColor && (
                  <div className="flex items-center gap-2 mb-4">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Cor: {getEbcColorName(style.ebcColor)} (EBC {style.ebcColor})
                    </span>
                    <div 
                      className="w-4 h-4 rounded border" 
                      style={getEbcColorStyle(style.ebcColor)}
                    />
                  </div>
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
