import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

const ebcColors = [
  { value: 2, name: "Palha", color: "#F3E5AB", description: "Muito claro, quase incolor" },
  { value: 4, name: "Amarelo claro", color: "#F6F513", description: "Amarelo claro brilhante" },
  { value: 6, name: "Dourado", color: "#FFD700", description: "Dourado clássico" },
  { value: 8, name: "Âmbar claro", color: "#FFBF00", description: "Âmbar claro" },
  { value: 12, name: "Âmbar", color: "#D2691E", description: "Âmbar médio" },
  { value: 16, name: "Cobre", color: "#B87333", description: "Cobre avermelhado" },
  { value: 20, name: "Marrom claro", color: "#8B4513", description: "Marrom claro" },
  { value: 30, name: "Marrom", color: "#654321", description: "Marrom médio" },
  { value: 40, name: "Marrom escuro", color: "#3C1810", description: "Marrom muito escuro" },
  { value: 80, name: "Preto", color: "#0F0A08", description: "Preto opaco" },
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

// Dados dos estilos do cardápio Don Juarez
const donJuarezStyles = [
  {
    name: "Pilsen",
    description: "É o queridinho da galera! Levinho, refrescante e com coloração dourada. IBU: 9 / ABV: 4%.",
    ebcColor: 6 // Dourado
  },
  {
    name: "Red Ale",
    description: "Com coloração cobre avermelhada, o nosso red tem aromas e sabores que remetem a caramelo e toffee. IBU: 23 / ABV: 5%.",
    ebcColor: 16 // Cobre
  },
  {
    name: "APA",
    description: "American Pale Ale com aromas e sabores que remetem a laranja. IBU: 35 / ABV: 5%.",
    ebcColor: 12 // Âmbar
  },
  {
    name: "IPA",
    description: "India Pale Ale com amargor um pouco acentuado, com leve sabor de maracujá e espuma consistente. IBU: 54 / ABV: 6%.",
    ebcColor: 12 // Âmbar
  },
  {
    name: "Session IPA",
    description: "Chope suave, com uma generosa carga de lúpulos que traz sabores e aromas de frutas cítricas. IBU: 30 / ABV 5%.",
    ebcColor: 8 // Âmbar claro
  },
  {
    name: "Double IPA",
    description: "Chope com muita potência de sabor e aroma. Bem frutado e de cor âmbar. IBU: 65 / ABV: 9%.",
    ebcColor: 16 // Cobre
  },
  {
    name: "Stout",
    description: "Chope escuro, com aromas e sabores de café e chocolate amargo. IBU: 33 / ABV: 5%.",
    ebcColor: 40 // Marrom escuro
  },
  {
    name: "Blonde Ale Maracujá",
    description: "Cerveja leve, clara, de baixo teor alcoólico e amargor moderado, com adição de maracujá, que predomina no aroma e sabor, trazendo leve acidez. Contém trigo. IBU: 28 / ABV 4,1%",
    ebcColor: 4 // Amarelo claro
  },
  {
    name: "Fruit Beer",
    description: "Cerveja levemente ácida, com adição grande de frutas vermelhas e baixo amargor. 5,4% ABV / IBU 21",
    ebcColor: 20 // Marrom claro (frutas vermelhas)
  }
];

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

  const importDonJuarezStyles = async () => {
    if (confirm("Deseja importar os estilos do cardápio Don Juarez? Estilos já existentes serão ignorados.")) {
      try {
        const existingStyles = Array.isArray(beerStyles) ? beerStyles : [];
        const existingNames = existingStyles.map((style: any) => style.name.toLowerCase());
        
        let importedCount = 0;
        let skippedCount = 0;
        
        for (const style of donJuarezStyles) {
          const styleName = style.name.toLowerCase();
          
          if (!existingNames.includes(styleName)) {
            await apiRequest("POST", "/api/beer-styles", style);
            importedCount++;
          } else {
            skippedCount++;
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ["/api/beer-styles"] });
        
        if (importedCount > 0) {
          toast({
            title: "Sucesso",
            description: `${importedCount} estilos importados. ${skippedCount} já existiam e foram ignorados.`,
          });
        } else {
          toast({
            title: "Informação",
            description: "Todos os estilos do cardápio já estão cadastrados.",
          });
        }
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao importar estilos do cardápio",
          variant: "destructive",
        });
      }
    }
  };

  const getTapsUsingStyle = (styleId: number) => {
    if (!taps || !Array.isArray(taps)) return 0;
    return taps.filter((tap: any) => tap.currentBeerStyleId === styleId).length;
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
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={importDonJuarezStyles}>
            <Beer className="mr-2 h-4 w-4" />
            Importar Cardápio
          </Button>
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
                <DialogDescription>
                  {editingStyle 
                    ? "Atualize as informações do estilo de cerveja incluindo a cor EBC."
                    : "Adicione um novo estilo de cerveja com nome, descrição e cor EBC."
                  }
                </DialogDescription>
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
                    placeholder="Descreva as características deste estilo de cerveja"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="ebcColor">Cor EBC</Label>
                  <Select value={formData.ebcColor?.toString() || ""} onValueChange={(value) => setFormData({ ...formData, ebcColor: value ? Number(value) : null })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a cor EBC" />
                    </SelectTrigger>
                    <SelectContent>
                      {ebcColors.map((color) => (
                        <SelectItem key={color.value} value={color.value.toString()}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded border" 
                              style={{ backgroundColor: color.color }}
                            />
                            {color.name} (EBC {color.value})
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
                  <CardTitle className="text-lg">{style.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(style)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(style.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
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