import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Package,
  User, 
  Calendar,
  Search,
  Building2,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { StockCountWithRelations, ProductCategory, Product } from "@shared/schema";

export default function PublicStockCount() {
  const [, params] = useRoute("/contagem-publica/:token");
  const publicToken = params?.token || "";
  
  const [searchTerm, setSearchTerm] = useState("");
  const [countItems, setCountItems] = useState<{ productId: number; countedQuantity: string }[]>([]);
  const [isBeginning, setIsBeginning] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const queryClient = useQueryClient();

  // Carregar dados da contagem pública
  const { data: stockCount, isLoading } = useQuery<StockCountWithRelations>({
    queryKey: ["/api/stock-counts/public", publicToken],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/stock-counts/public/${publicToken}`);
      return await response.json();
    },
    enabled: !!publicToken
  });

  // Carregar categorias
  const { data: categories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"],
  });

  // Carregar produtos da unidade da contagem
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products", "by-unit", stockCount?.unitId],
    queryFn: async () => {
      if (!stockCount?.unitId) return [];
      const response = await apiRequest("GET", `/api/products/by-unit/${stockCount.unitId}`);
      return await response.json();
    },
    enabled: !!stockCount?.unitId
  });

  // Inicializar items da contagem
  useEffect(() => {
    if (stockCount?.items) {
      setCountItems(stockCount.items.map(item => ({
        productId: item.productId,
        countedQuantity: item.countedQuantity || "0"
      })));
    }
  }, [stockCount]);

  // Mutation para iniciar contagem via token público
  const beginCountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/stock-counts/public/${publicToken}/begin`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-counts/public", publicToken] });
      toast({
        title: "Contagem iniciada",
        description: "Agora você pode começar a contar os produtos",
      });
      setIsBeginning(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao iniciar contagem",
        variant: "destructive",
      });
      setIsBeginning(false);
    },
  });

  // Mutation para salvar quantidades
  const saveCountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", `/api/stock-counts/public/${publicToken}/items`, {
        items: countItems
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quantidades salvas",
        description: "Suas contagens foram salvas automaticamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar quantidades",
        variant: "destructive",
      });
    },
  });

  // Mutation para finalizar a contagem
  const finishCountMutation = useMutation({
    mutationFn: async () => {
      // Primeiro salva as quantidades atuais
      if (countItems.length > 0) {
        await apiRequest("PUT", `/api/stock-counts/public/${publicToken}/items`, {
          items: countItems
        });
      }
      
      // Depois finaliza a contagem
      const response = await apiRequest("POST", `/api/stock-counts/public/${publicToken}/finish`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contagem finalizada",
        description: "A contagem foi finalizada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-counts/public", publicToken] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao finalizar contagem",
        variant: "destructive",
      });
      setIsFinishing(false);
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
        return [...prev, { productId, countedQuantity: quantity }];
      }
    });
  };

  const getItemQuantity = (productId: number): string => {
    const item = countItems.find(item => item.productId === productId);
    return item?.countedQuantity || "0";
  };

  // Função para alternar expansão de categoria
  const toggleCategoryExpansion = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // Verificar se todos os produtos de uma categoria foram contados
  const isCategoryComplete = (categoryProducts: Product[]): boolean => {
    return categoryProducts.every(product => {
      const quantity = getItemQuantity(product.id);
      return quantity !== "" && parseFloat(quantity) > 0;
    });
  };

  // Verificar se categoria está expandida (padrão: expandida)
  const isCategoryExpanded = (categoryName: string): boolean => {
    return expandedCategories[categoryName] !== false;
  };

  const handleBeginCount = () => {
    setIsBeginning(true);
    beginCountMutation.mutate();
  };

  const handleFinishCount = () => {
    setIsFinishing(true);
    finishCountMutation.mutate();
  };

  // Salvar automaticamente após mudanças
  useEffect(() => {
    if (stockCount?.status === 'em_contagem' && countItems.length > 0) {
      const timer = setTimeout(() => {
        saveCountMutation.mutate();
      }, 2000); // Salva 2 segundos após parar de digitar

      return () => clearTimeout(timer);
    }
  }, [countItems, stockCount?.status]);

  // Auto-colapsar categorias quando completadas
  useEffect(() => {
    if (products.length > 0) {
      Object.entries(productsByCategory).forEach(([categoryName, categoryProducts]) => {
        if (isCategoryComplete(categoryProducts) && isCategoryExpanded(categoryName)) {
          // Colapsar categoria automaticamente após 1 segundo
          setTimeout(() => {
            setExpandedCategories(prev => ({
              ...prev,
              [categoryName]: false
            }));
          }, 1000);
        }
      });
    }
  }, [countItems, products]);

  // Agrupar produtos por categoria
  const productsByCategory = products.reduce((acc, product) => {
    const category = categories.find(cat => cat.id === parseInt(product.stockCategory));
    const categoryName = category ? category.name : 'Sem categoria';
    
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Aplicar busca e ordenação
  const filteredAndOrderedData = Object.entries(productsByCategory)
    .map(([categoryName, categoryProducts]) => {
      const filteredProducts = categoryProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return {
        category: categoryName,
        products: filteredProducts
      };
    })
    .filter(item => item.products.length > 0);

  // Aplicar ordenação salva se disponível
  let orderedData = filteredAndOrderedData;
  if (stockCount?.categoryOrder) {
    try {
      const savedCategoryOrder = JSON.parse(stockCount.categoryOrder);
      const savedProductOrder = stockCount.productOrder ? JSON.parse(stockCount.productOrder) : {};
      
      // Ordenar categorias
      const orderedCategories = savedCategoryOrder.filter((cat: string) => 
        filteredAndOrderedData.some(item => item.category === cat)
      );
      
      orderedData = orderedCategories.map((categoryName: string) => {
        const categoryData = filteredAndOrderedData.find(item => item.category === categoryName);
        if (!categoryData) return null;
        
        // Ordenar produtos dentro da categoria
        const savedOrder = savedProductOrder[categoryName] || [];
        const orderedProducts = savedOrder.length > 0 
          ? savedOrder.map((productName: string) => 
              categoryData.products.find(p => p.name === productName)
            ).filter(Boolean) as Product[]
          : categoryData.products;
        
        return {
          category: categoryName,
          products: orderedProducts
        };
      }).filter(Boolean) as typeof filteredAndOrderedData;
    } catch (error) {
      console.error("Error parsing saved order:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando contagem...</p>
        </div>
      </div>
    );
  }

  if (!stockCount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Contagem não encontrada</h1>
          <p className="text-gray-600">O link de contagem não é válido ou expirou.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Contagem de Estoque #{stockCount.id}
            </h1>
            <div className="flex flex-col sm:flex-row items-center justify-center sm:space-x-6 space-y-2 sm:space-y-0 text-sm text-gray-600">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {format(new Date(stockCount.date), "dd/MM/yyyy", { locale: ptBR })}
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {stockCount.responsible?.firstName} {stockCount.responsible?.lastName}
              </div>
              <div className="flex items-center">
                <Building2 className="h-4 w-4 mr-1" />
                {stockCount.unit?.name}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Status da contagem */}
        {(stockCount.status === 'pronta_para_contagem' || stockCount.status === 'started') && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6 text-center">
              <h2 className="text-xl font-semibold text-orange-800 mb-2">
                Contagem pronta para ser iniciada
              </h2>
              <p className="text-orange-700 mb-4">
                Clique no botão abaixo para começar a contagem dos produtos.
              </p>
              <Button 
                onClick={handleBeginCount} 
                disabled={isBeginning}
                className="bg-orange-600 hover:bg-orange-700"
                size="lg"
              >
                <Clock className="h-5 w-5 mr-2" />
                {isBeginning ? "Iniciando..." : "Iniciar Contagem"}
              </Button>
            </CardContent>
          </Card>
        )}

        {stockCount.status === 'em_contagem' && (
          <>
            {/* Resumo rápido */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
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
                      {products.length > 0 ? 
                        ((countItems.filter(item => parseFloat(item.countedQuantity) > 0).length / products.length) * 100).toFixed(1) 
                        : "0"
                      }%
                    </div>
                    <div className="text-sm text-gray-600">Progresso</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Busca */}
            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Input
                    placeholder="Buscar produtos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 text-base sm:text-lg"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Produtos por categoria */}
            <div className="space-y-3 sm:space-y-6">
              {orderedData.map(({ category: categoryName, products: categoryProducts }) => {
                const isComplete = isCategoryComplete(categoryProducts);
                const isExpanded = isCategoryExpanded(categoryName);
                const countedItems = categoryProducts.filter(product => {
                  const quantity = getItemQuantity(product.id);
                  return quantity !== "" && parseFloat(quantity) > 0;
                }).length;
                
                return (
                  <Card key={categoryName} className={isComplete ? "border-green-200 bg-green-50" : ""}>
                    <CardHeader 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleCategoryExpansion(categoryName)}
                    >
                      <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                        <div className="flex items-center min-w-0 flex-1">
                          {isComplete ? (
                            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-green-600 flex-shrink-0" />
                          ) : (
                            <Package className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-orange-600 flex-shrink-0" />
                          )}
                          <span className="truncate">{categoryName}</span>
                          <Badge variant="outline" className="ml-2 sm:ml-3 text-xs sm:text-sm">
                            {countedItems}/{categoryProducts.length}
                          </Badge>
                        </div>
                        <div className="flex items-center flex-shrink-0 ml-2">
                          {isComplete && (
                            <Badge className="mr-1 sm:mr-2 bg-green-600 text-xs hidden sm:inline-flex">
                              Completa
                            </Badge>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent>
                        <div className="grid gap-2 sm:gap-3">
                          {categoryProducts.map((product) => (
                            <div
                              key={product.id}
                              className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg bg-white"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-base sm:text-lg truncate">{product.name}</div>
                                <div className="text-xs sm:text-sm text-gray-500">Código: {product.code}</div>
                              </div>
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={getItemQuantity(product.id)}
                                  onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                  className="w-24 sm:w-32 text-center text-base sm:text-lg font-medium"
                                  placeholder="0.000"
                                />
                                <div className="text-xs sm:text-sm text-gray-500 w-8 sm:w-12 text-center">
                                  {product.unitOfMeasure || 'UN'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Botão Finalizar Contagem */}
            <div className="flex justify-center pt-4 sm:pt-6">
              <Button
                onClick={handleFinishCount}
                disabled={isFinishing}
                className="bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 py-2 sm:py-3 text-base sm:text-lg font-medium w-full sm:w-auto"
                size="lg"
              >
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                {isFinishing ? "Finalizando..." : "Finalizar Contagem"}
              </Button>
            </div>
          </>
        )}

        {stockCount.status === 'contagem_finalizada' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-800 mb-2">
                Contagem finalizada
              </h2>
              <p className="text-green-700">
                Esta contagem foi concluída e não pode mais ser alterada.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}