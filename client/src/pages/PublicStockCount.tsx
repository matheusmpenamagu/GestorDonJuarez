import { useState, useEffect, useRef } from "react";
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const inputRefs = useRef<{ [key: string]: HTMLInputElement }>({});

  // Carregar dados da contagem pública
  const { data: stockCount, isLoading } = useQuery<StockCountWithRelations>({
    queryKey: [`/api/stock-counts/public/${publicToken}`],
    enabled: !!publicToken,
  });

  // Carregar categorias
  const { data: categories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"],
  });

  // Carregar produtos da unidade específica
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: [`/api/products/public/by-unit/${stockCount?.unitId}`],
    enabled: !!stockCount?.unitId,
  });

  // Carregar itens da contagem se já existe
  const { data: existingItems = [] } = useQuery<any[]>({
    queryKey: ["/api/stock-counts", stockCount?.id, "items"],
    enabled: !!stockCount?.id && stockCount?.status === 'em_contagem',
  });

  // Inicializar countItems com dados existentes
  useEffect(() => {
    if (existingItems && existingItems.length > 0) {
      const initialItems = existingItems.map((item: any) => ({
        productId: item.productId,
        countedQuantity: item.countedQuantity || ""
      }));
      setCountItems(initialItems);
    }
  }, [existingItems]);

  // Mutations para iniciar e finalizar contagem
  const beginCountMutation = useMutation({
    mutationFn: () => apiRequest(`/api/stock-counts/public/${publicToken}/begin`, "POST"),
    onSuccess: () => {
      setIsBeginning(false);
      queryClient.invalidateQueries({ queryKey: [`/api/stock-counts/public/${publicToken}`] });
      toast({
        title: "Contagem iniciada",
        description: "Agora você pode contar os produtos!",
      });
    },
    onError: () => {
      setIsBeginning(false);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a contagem",
        variant: "destructive",
      });
    },
  });

  const finishCountMutation = useMutation({
    mutationFn: () => apiRequest(`/api/stock-counts/public/${publicToken}/finish`, "POST"),
    onSuccess: () => {
      setIsFinishing(false);
      queryClient.invalidateQueries({ queryKey: [`/api/stock-counts/public/${publicToken}`] });
      toast({
        title: "Contagem finalizada!",
        description: "A contagem foi concluída com sucesso.",
      });
    },
    onError: () => {
      setIsFinishing(false);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar a contagem",
        variant: "destructive",
      });
    },
  });

  // Atualizar itens da contagem
  const updateItemsMutation = useMutation({
    mutationFn: (items: { productId: number; countedQuantity: string }[]) => {
      console.log("Enviando dados para salvamento:", { items, publicToken });
      return apiRequest(`/api/stock-counts/public/${publicToken}/items`, "PUT", { items });
    },
    onSuccess: (data) => {
      console.log("Dados salvos com sucesso:", data);
      toast({
        title: "Sucesso",
        description: "Alterações salvas automaticamente",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: `Não foi possível salvar as alterações: ${error?.message || 'Erro desconhecido'}`,
        variant: "destructive",
      });
    },
  });

  // Função para obter quantidade de um produto
  const getItemQuantity = (productId: number): string => {
    const item = countItems.find(item => item.productId === productId);
    return item?.countedQuantity || "";
  };

  // Função para atualizar quantidade de um produto
  const updateItemQuantity = (productId: number, quantity: string) => {
    // Aceitar vírgula como separador decimal e converter para ponto
    const normalizedQuantity = quantity.replace(',', '.');
    
    setCountItems(prev => {
      const updated = prev.filter(item => item.productId !== productId);
      if (normalizedQuantity !== "") {
        updated.push({ productId, countedQuantity: normalizedQuantity });
      }
      return updated;
    });
  };

  // Função para focar no próximo campo
  const focusNextField = (currentProductId: number) => {
    // Encontrar todos os produtos visíveis na ordem das categorias expandidas
    const allVisibleProducts: Product[] = [];
    
    orderedData.forEach(({ category, products: categoryProducts }) => {
      if (isCategoryExpanded(category)) {
        allVisibleProducts.push(...categoryProducts);
      }
    });

    // Encontrar o índice do produto atual
    const currentIndex = allVisibleProducts.findIndex(p => p.id === currentProductId);
    
    // Focar no próximo produto
    if (currentIndex >= 0 && currentIndex < allVisibleProducts.length - 1) {
      const nextProduct = allVisibleProducts[currentIndex + 1];
      const nextInputRef = inputRefs.current[`product-${nextProduct.id}`];
      if (nextInputRef) {
        setTimeout(() => {
          nextInputRef.focus();
          nextInputRef.select();
        }, 50);
      }
    } else {
      // Se chegou ao fim da categoria atual, tentar expandir próxima categoria
      const currentCategoryIndex = orderedData.findIndex(item => 
        item.products.some(p => p.id === currentProductId)
      );
      
      if (currentCategoryIndex >= 0 && currentCategoryIndex < orderedData.length - 1) {
        const nextCategory = orderedData[currentCategoryIndex + 1];
        if (!isCategoryComplete(nextCategory.products)) {
          // Expandir próxima categoria e colapsar atual
          const currentCategory = orderedData[currentCategoryIndex];
          setExpandedCategories({
            [currentCategory.category]: false,
            [nextCategory.category]: true
          });
        }
      }
    }
  };

  // Detectar se é dispositivo móvel
  const isMobile = () => {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Função para navegar com Enter (desabilitado no mobile)
  const handleKeyPress = (e: React.KeyboardEvent, productId: number) => {
    if (e.key === 'Enter' && !isMobile()) {
      e.preventDefault();
      focusNextField(productId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, productId: number) => {
    // Só usar Tab para navegação no desktop
    if (e.key === 'Tab' && !e.shiftKey && !isMobile()) {
      e.preventDefault();
      focusNextField(productId);
    }
  };

  // Função para colapsar/expandir categoria
  const toggleCategoryExpansion = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // Auto-salvar mudanças
  useEffect(() => {
    if (stockCount?.status === 'em_contagem' && countItems.length > 0) {
      const timer = setTimeout(() => {
        updateItemsMutation.mutate(countItems);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countItems, stockCount?.status]);

  // Verificar se todos os produtos de uma categoria foram contados
  const isCategoryComplete = (categoryProducts: Product[]): boolean => {
    return categoryProducts.every(product => {
      const quantity = getItemQuantity(product.id);
      return quantity !== "" && parseFloat(quantity) > 0;
    });
  };

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
        
        // Ordenar produtos dentro da categoria se houver ordem salva
        if (savedProductOrder[categoryName]) {
          const productOrder = savedProductOrder[categoryName];
          const orderedProducts = productOrder
            .map((productId: number) => categoryData.products.find(p => p.id === productId))
            .filter(Boolean);
          
          // Adicionar produtos não ordenados no final
          const unorderedProducts = categoryData.products.filter(p => 
            !productOrder.includes(p.id)
          );
          
          return {
            ...categoryData,
            products: [...orderedProducts, ...unorderedProducts]
          };
        }
        
        return categoryData;
      }).filter(Boolean);
      
      // Adicionar categorias não ordenadas no final
      const unorderedCategories = filteredAndOrderedData.filter(item => 
        !savedCategoryOrder.includes(item.category)
      );
      orderedData = [...orderedData, ...unorderedCategories];
    } catch (error) {
      console.error("Erro ao aplicar ordenação:", error);
      orderedData = filteredAndOrderedData;
    }
  }

  // Verificar se categoria está expandida (navegação sequencial)
  const isCategoryExpanded = (categoryName: string): boolean => {
    // Se não há estado salvo, usar lógica sequencial
    if (Object.keys(expandedCategories).length === 0) {
      const categoryIndex = orderedData.findIndex(item => item.category === categoryName);
      
      // Encontrar a primeira categoria incompleta
      const firstIncompleteIndex = orderedData.findIndex(item => 
        !isCategoryComplete(item.products)
      );
      
      // Se todas estão completas, mostrar todas colapsadas
      if (firstIncompleteIndex === -1) {
        return false;
      }
      
      // Mostrar apenas a primeira categoria incompleta
      return categoryIndex === firstIncompleteIndex;
    }
    
    // Usar estado salvo
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

  // Navegação sequencial automática entre categorias
  useEffect(() => {
    if (products.length > 0 && orderedData.length > 0) {
      // Encontrar categoria atualmente expandida
      const currentExpandedIndex = orderedData.findIndex(item => 
        isCategoryExpanded(item.category)
      );
      
      // Se existe uma categoria expandida
      if (currentExpandedIndex !== -1) {
        const currentCategory = orderedData[currentExpandedIndex];
        
        // Se a categoria atual está completa
        if (isCategoryComplete(currentCategory.products)) {
          // Encontrar próxima categoria incompleta
          const nextIncompleteIndex = orderedData.findIndex((item, index) => 
            index > currentExpandedIndex && !isCategoryComplete(item.products)
          );
          
          setTimeout(() => {
            if (nextIncompleteIndex !== -1) {
              // Expandir próxima categoria e colapsar atual
              const nextCategory = orderedData[nextIncompleteIndex];
              setExpandedCategories({
                [currentCategory.category]: false,
                [nextCategory.category]: true
              });
            } else {
              // Todas categorias completas, colapsar tudo
              setExpandedCategories(prev => ({
                ...prev,
                [currentCategory.category]: false
              }));
            }
          }, 1000);
        }
      }
    }
  }, [countItems, products]);

  // Inicializar primeira categoria expandida e focar primeiro campo (só no desktop)
  useEffect(() => {
    if (orderedData.length > 0 && Object.keys(expandedCategories).length === 0) {
      // Encontrar primeira categoria incompleta
      const firstIncompleteIndex = orderedData.findIndex(item => 
        !isCategoryComplete(item.products)
      );
      
      if (firstIncompleteIndex !== -1) {
        const firstIncompleteCategory = orderedData[firstIncompleteIndex];
        setExpandedCategories({
          [firstIncompleteCategory.category]: true
        });

        // Focar no primeiro campo apenas no desktop
        if (!isMobile()) {
          setTimeout(() => {
            const firstProduct = firstIncompleteCategory.products[0];
            if (firstProduct) {
              const firstInputRef = inputRefs.current[`product-${firstProduct.id}`];
              if (firstInputRef) {
                firstInputRef.focus();
                firstInputRef.select();
              }
            }
          }, 500);
        }
      }
    }
  }, [orderedData]);

  // Focar no primeiro campo quando uma nova categoria é expandida (só no desktop)
  useEffect(() => {
    if (isMobile()) return; // Não focar automaticamente no mobile
    
    const expandedCategoryNames = Object.keys(expandedCategories).filter(
      key => expandedCategories[key] === true
    );
    
    if (expandedCategoryNames.length === 1) {
      const expandedCategory = orderedData.find(item => 
        item.category === expandedCategoryNames[0]
      );
      
      if (expandedCategory) {
        setTimeout(() => {
          // Focar no primeiro produto não contado da categoria expandida
          const firstUncounteProduct = expandedCategory.products.find(product => 
            getItemQuantity(product.id) === ""
          );
          
          if (firstUncounteProduct) {
            const inputRef = inputRefs.current[`product-${firstUncounteProduct.id}`];
            if (inputRef) {
              inputRef.focus();
              inputRef.select();
            }
          }
        }, 300);
      }
    }
  }, [expandedCategories, countItems]);

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
            {/* Estatísticas da contagem */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{products.length}</div>
                    <div className="text-sm text-gray-600">Total de produtos</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{countItems.length}</div>
                    <div className="text-sm text-gray-600">Produtos contados</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{products.length - countItems.length}</div>
                    <div className="text-sm text-gray-600">Restantes</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Barra de busca */}
            <Card>
              <CardContent className="pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar produto por nome ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lista de produtos por categoria */}
            <div className="space-y-4">
              {orderedData.map(({ category: categoryName, products: categoryProducts }) => {
                const isExpanded = isCategoryExpanded(categoryName);
                const isComplete = isCategoryComplete(categoryProducts);
                const countedItems = categoryProducts.filter(product => {
                  const quantity = getItemQuantity(product.id);
                  return quantity !== "" && parseFloat(quantity) > 0;
                }).length;

                return (
                  <Card key={categoryName} className={isComplete ? "border-green-200" : "border-gray-200"}>
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
                      <CardContent className="pt-0">
                        <Separator className="mb-4" />
                        <div className="space-y-3">
                          {categoryProducts.map((product) => (
                            <div key={product.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg space-y-3 sm:space-y-0">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                    {product.code}
                                  </span>
                                  <span className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                    {product.name}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 font-medium">
                                  {product.unitOfMeasure}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <Input
                                  ref={(ref) => {
                                    if (ref) {
                                      inputRefs.current[`product-${product.id}`] = ref;
                                    }
                                  }}
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0,000"
                                  value={getItemQuantity(product.id)}
                                  onChange={(e) => updateItemQuantity(product.id, e.target.value)}
                                  onKeyPress={(e) => handleKeyPress(e, product.id)}
                                  onKeyDown={(e) => handleKeyDown(e, product.id)}
                                  className="w-24 sm:w-28 text-center text-sm focus:ring-2 focus:ring-orange-500"
                                  autoComplete="off"
                                />
                                <span className="text-sm font-medium text-gray-600 min-w-0">
                                  {product.unitOfMeasure}
                                </span>
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