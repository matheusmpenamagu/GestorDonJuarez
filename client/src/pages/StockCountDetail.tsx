import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ArrowLeft, 
  Save, 
  Play, 
  Package, 
  User, 
  Calendar,
  Search,
  Plus,
  Minus,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { StockCountWithRelations, ProductCategory, Product } from "@shared/schema";

export default function StockCountDetail() {
  const [, params] = useRoute("/estoque/contagens/:id");
  const [, setLocation] = useLocation();
  const stockCountId = parseInt(params?.id || "0");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [countItems, setCountItems] = useState<{ productId: number; countedQuantity: string; notes?: string }[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [productOrder, setProductOrder] = useState<Record<string, string[]>>({});

  const queryClient = useQueryClient();

  // Carregar dados da contagem
  const { data: stockCount, isLoading } = useQuery<StockCountWithRelations>({
    queryKey: ["/api/stock-counts", stockCountId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/stock-counts/${stockCountId}`);
      return await response.json();
    },
    enabled: !!stockCountId
  });

  // Carregar categorias
  const { data: categories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"],
  });

  // Carregar produtos
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Carregar ordem da contagem anterior
  const { data: previousOrder } = useQuery({
    queryKey: ["/api/stock-counts", stockCountId, "previous-order"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/stock-counts/${stockCountId}/previous-order`);
      return await response.json();
    },
    enabled: !!stockCountId
  });

  // Inicializar items da contagem
  useEffect(() => {
    if (stockCount?.items) {
      setCountItems(stockCount.items.map(item => ({
        productId: item.productId,
        countedQuantity: item.countedQuantity || "0",
        notes: item.notes || "",
      })));
    }
  }, [stockCount]);

  // Agrupar produtos por categoria (mapeando para nome correto)
  const productsByCategory = products.reduce((acc, product) => {
    // Verificar se stockCategory é um ID numérico ou nome direto
    let categoryName = "Sem categoria";
    
    if (product.stockCategory) {
      // Se for um número, buscar na lista de categorias
      if (!isNaN(Number(product.stockCategory))) {
        const categoryId = Number(product.stockCategory);
        const category = categories.find(cat => cat.id === categoryId);
        categoryName = category ? category.name : `Categoria ID ${categoryId}`;
      } else {
        // Se for string, usar diretamente
        categoryName = product.stockCategory;
      }
    }
    
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Aplicar ordenação inteligente baseada na contagem anterior
  const getOrderedCategories = () => {
    const categoryNames = Object.keys(productsByCategory);
    
    if (previousOrder?.hasOrder && previousOrder?.categories?.length > 0) {
      // Usar ordem da contagem anterior
      const orderedCategories = [...previousOrder.categories];
      
      // Adicionar categorias que não estavam na contagem anterior
      categoryNames.forEach(catName => {
        if (!orderedCategories.includes(catName)) {
          orderedCategories.push(catName);
        }
      });
      
      return orderedCategories.filter(catName => categoryNames.includes(catName));
    } else {
      // Ordem alfabética como fallback
      return categoryNames.sort();
    }
  };

  const getOrderedProducts = (categoryName: string) => {
    const categoryProducts = productsByCategory[categoryName] || [];
    
    if (previousOrder?.hasOrder && previousOrder?.products?.[categoryName]?.length > 0) {
      // Usar ordem da contagem anterior
      const orderedProductNames = [...previousOrder.products[categoryName]];
      const orderedProducts: Product[] = [];
      
      // Adicionar produtos na ordem da contagem anterior
      orderedProductNames.forEach(productName => {
        const product = categoryProducts.find(p => p.name === productName);
        if (product) {
          orderedProducts.push(product);
        }
      });
      
      // Adicionar produtos que não estavam na contagem anterior
      categoryProducts.forEach(product => {
        if (!orderedProductNames.includes(product.name)) {
          orderedProducts.push(product);
        }
      });
      
      return orderedProducts;
    } else {
      // Ordem alfabética como fallback
      return categoryProducts.sort((a, b) => a.name.localeCompare(b.name));
    }
  };

  // Filtrar produtos baseado na busca e aplicar ordenação
  const getFilteredAndOrderedData = () => {
    const orderedCategories = getOrderedCategories();
    const result: Array<{ category: string; products: Product[] }> = [];
    
    orderedCategories.forEach(categoryName => {
      const orderedProducts = getOrderedProducts(categoryName);
      const filteredProducts = orderedProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (filteredProducts.length > 0) {
        result.push({
          category: categoryName,
          products: filteredProducts
        });
      }
    });
    
    return result;
  };

  const filteredAndOrderedData = getFilteredAndOrderedData();

  // Mutation para salvar contagem
  const saveCountMutation = useMutation({
    mutationFn: async (items: typeof countItems) => {
      const response = await apiRequest("POST", `/api/stock-counts/${stockCountId}/items`, {
        items
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-counts"] });
      toast({
        title: "Contagem salva",
        description: "Dados salvos com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar contagem",
        variant: "destructive",
      });
    },
  });

  // Mutation para iniciar contagem
  const startCountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/stock-counts/${stockCountId}/start`);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-counts"] });
      toast({
        title: "Contagem iniciada",
        description: `Link público enviado via WhatsApp: ${data.publicUrl}`,
      });
      setIsStarting(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao iniciar contagem",
        variant: "destructive",
      });
      setIsStarting(false);
    },
  });

  const handleQuantityChange = (productId: number, quantity: string) => {
    setCountItems(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item => 
          item.productId === productId 
            ? { ...item, countedQuantity: quantity }
            : item
        );
      } else {
        return [...prev, { productId, countedQuantity: quantity, notes: "" }];
      }
    });
  };

  const handleNotesChange = (productId: number, notes: string) => {
    setCountItems(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item => 
          item.productId === productId 
            ? { ...item, notes }
            : item
        );
      } else {
        return [...prev, { productId, countedQuantity: "0", notes }];
      }
    });
  };

  const getItemQuantity = (productId: number) => {
    const item = countItems.find(item => item.productId === productId);
    return item?.countedQuantity || "0";
  };

  const getItemNotes = (productId: number) => {
    const item = countItems.find(item => item.productId === productId);
    return item?.notes || "";
  };

  const handleSave = () => {
    saveCountMutation.mutate(countItems);
  };

  const handleStartCount = () => {
    setIsStarting(true);
    startCountMutation.mutate();
  };

  if (isLoading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!stockCount) {
    return <div className="p-6">Contagem não encontrada</div>;
  }

  const statusBadgeColor = {
    draft: "secondary",
    started: "default", 
    completed: "outline"
  } as const;

  const statusText = {
    draft: "Rascunho",
    started: "Iniciada",
    completed: "Concluída"
  } as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/estoque/contagens")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Contagem de Estoque #{stockCount.id}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {format(new Date(stockCount.date), "dd/MM/yyyy", { locale: ptBR })}
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {stockCount.responsible?.firstName} {stockCount.responsible?.lastName}
              </div>
              <Badge variant={statusBadgeColor[stockCount.status as keyof typeof statusBadgeColor]}>
                {statusText[stockCount.status as keyof typeof statusText]}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {stockCount.status === "draft" && (
            <>
              <Button onClick={handleSave} disabled={saveCountMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {saveCountMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button 
                onClick={handleStartCount} 
                disabled={isStarting}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Play className="h-4 w-4 mr-2" />
                {isStarting ? "Iniciando..." : "Iniciar Contagem"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar produtos por nome ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products by Category */}
      <div className="space-y-6">
        {filteredAndOrderedData.map(({ category: categoryName, products: categoryProducts }) => (
          <Card key={categoryName}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2 text-orange-600" />
                {categoryName}
                <Badge variant="outline" className="ml-2">
                  {categoryProducts.length} itens
                </Badge>
                {previousOrder?.hasOrder && previousOrder?.previousStockCountId && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Ordem da contagem #{previousOrder.previousStockCountId}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categoryProducts.map((product) => (
                  <div key={product.id} className="grid grid-cols-3 gap-2 items-center py-2 px-3 border rounded-md">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="text-xs text-gray-500">
                        {product.code} • {product.unit}
                      </div>
                    </div>
                    <div>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={getItemQuantity(product.id)}
                        onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                        placeholder="0"
                        disabled={stockCount.status !== "draft"}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Input
                        value={getItemNotes(product.id)}
                        onChange={(e) => handleNotesChange(product.id, e.target.value)}
                        placeholder="Obs..."
                        disabled={stockCount.status !== "draft"}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {products.length}
              </div>
              <div className="text-sm text-gray-600">Total de Produtos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {countItems.filter(item => parseFloat(item.countedQuantity) > 0).length}
              </div>
              <div className="text-sm text-gray-600">Produtos Contados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {filteredAndOrderedData.length}
              </div>
              <div className="text-sm text-gray-600">Categorias</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {countItems.filter(item => item.notes && item.notes.trim()).length}
              </div>
              <div className="text-sm text-gray-600">Com Observações</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}