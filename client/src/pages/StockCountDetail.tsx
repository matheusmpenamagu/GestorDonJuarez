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
  Send,
  GripVertical,
  Trash2,
  Pencil,
  CheckCircle,
  Building2,
  Globe
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
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
  const [isStarting, setIsStarting] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [productOrder, setProductOrder] = useState<Record<string, string[]>>({});
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [removedProducts, setRemovedProducts] = useState<Set<number>>(new Set());
  const [isEditingQuantities, setIsEditingQuantities] = useState(false);
  const [editedQuantities, setEditedQuantities] = useState<Record<number, string>>({});

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

  // Carregar ordem da contagem anterior
  const { data: previousOrder } = useQuery({
    queryKey: ["/api/stock-counts", stockCountId, "previous-order"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/stock-counts/${stockCountId}/previous-order`);
      return await response.json();
    },
    enabled: !!stockCountId
  });



  // Inicializar ordem das categorias e produtos baseado na ordem salva ou prévia
  useEffect(() => {
    if (stockCount && products.length > 0) {
      console.log("Loading order for stock count:", stockCount.id);
      console.log("Stock count categoryOrder:", stockCount.categoryOrder);
      console.log("Stock count productOrder:", stockCount.productOrder);
      
      // Verificar se há ordem salva nesta contagem
      if (stockCount.categoryOrder && stockCount.productOrder) {
        try {
          const savedCategoryOrder = JSON.parse(stockCount.categoryOrder);
          const savedProductOrder = JSON.parse(stockCount.productOrder);
          console.log("Parsed saved categoryOrder:", savedCategoryOrder);
          console.log("Parsed saved productOrder:", savedProductOrder);
          setCategoryOrder(savedCategoryOrder);
          setProductOrder(savedProductOrder);
        } catch (error) {
          console.error("Error parsing saved order:", error);
          // Fallback para ordem anterior
          initializeFromPreviousOrder();
        }
      } else {
        console.log("No saved order found, using previous order");
        if (previousOrder) {
          initializeFromPreviousOrder();
        }
      }
    }
  }, [stockCount, previousOrder, products]);

  const initializeFromPreviousOrder = () => {
    if (previousOrder && products.length > 0) {
      const orderedCategories = getOrderedCategories();
      setCategoryOrder(orderedCategories);
      
      const orderedProducts: Record<string, string[]> = {};
      orderedCategories.forEach(categoryName => {
        orderedProducts[categoryName] = getOrderedProducts(categoryName).map(p => p.name);
      });
      setProductOrder(orderedProducts);
    }
  };

  // Filtrar produtos baseado no que existe na contagem atual + produtos não removidos localmente
  const availableProducts = products.filter(product => {
    // Se foi removido localmente, não mostrar
    if (removedProducts.has(product.id)) return false;
    
    // Se a contagem tem items salvos, mostrar apenas os que estão na contagem
    if (stockCount?.items && stockCount.items.length > 0) {
      return stockCount.items.some(item => item.productId === product.id);
    }
    
    // Se não há items salvos ainda, mostrar todos os produtos da unidade
    return true;
  });
  
  const productsByCategory = availableProducts.reduce((acc, product) => {
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
    // Usar categoryOrder se disponível, senão usar ordem padrão
    const orderedCategories = categoryOrder.length > 0 
      ? categoryOrder 
      : getOrderedCategories();
    
    console.log("getFilteredAndOrderedData - orderedCategories:", orderedCategories);
    console.log("getFilteredAndOrderedData - categoryOrder.length:", categoryOrder.length);
    
    const result: Array<{ category: string; products: Product[] }> = [];
    
    orderedCategories.forEach(categoryName => {
      // Verificar se a categoria ainda existe nos dados atuais
      if (!productsByCategory[categoryName]) {
        console.log("Category not found in productsByCategory:", categoryName);
        return;
      }
      
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
    
    console.log("getFilteredAndOrderedData - result:", result.map(r => r.category));
    return result;
  };

  const filteredAndOrderedData = getFilteredAndOrderedData();



  // Mutation para salvar ordem
  const saveOrderMutation = useMutation({
    mutationFn: async (orderData: { categoryOrder: string[]; productOrder: Record<string, string[]> }) => {
      const response = await apiRequest("POST", `/api/stock-counts/${stockCountId}/save-order`, orderData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ordem salva",
        description: "Ordem dos produtos e categorias salva com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar ordem",
        variant: "destructive",
      });
    },
  });

  // Mutation para salvar quantidades editadas
  const saveQuantitiesMutation = useMutation({
    mutationFn: async (quantities: Record<number, string>) => {
      const items = Object.entries(quantities).map(([productId, quantity]) => ({
        productId: parseInt(productId),
        countedQuantity: quantity
      }));
      
      const response = await apiRequest("PUT", `/api/stock-counts/${stockCountId}/items`, { items });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quantidades atualizadas",
        description: "As quantidades foram salvas com sucesso!",
      });
      setIsEditingQuantities(false);
      setEditedQuantities({});
      queryClient.invalidateQueries({ queryKey: ["/api/stock-counts", stockCountId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar quantidades",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar item da contagem
  const deleteItemMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await apiRequest("DELETE", `/api/stock-counts/${stockCountId}/items/${productId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-counts", stockCountId] });
      toast({
        title: "Produto removido",
        description: "Produto removido da contagem com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover produto",
        variant: "destructive",
      });
    },
  });

  // Mutation para iniciar contagem
  const startCountMutation = useMutation({
    mutationFn: async () => {
      console.log("startCountMutation.mutationFn chamado - stockCountId:", stockCountId);
      const response = await apiRequest("POST", `/api/stock-counts/${stockCountId}/start`);
      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("startCountMutation.onSuccess:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/stock-counts"] });
      toast({
        title: "Contagem iniciada",
        description: `Link público enviado via WhatsApp: ${data.publicUrl}`,
      });
      setIsStarting(false);
    },
    onError: (error: any) => {
      console.error("startCountMutation.onError:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
      toast({
        title: "Erro",
        description: error.message || "Erro ao iniciar contagem",
        variant: "destructive",
      });
      setIsStarting(false);
    },
  });



  // Configurar sensores para drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Funções para lidar com drag-and-drop de categorias
  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setCategoryOrder((items) => {
        // Se categoryOrder está vazio, inicializar com ordem das categorias
        const workingOrder = items.length > 0 ? items : Object.keys(productsByCategory);
        
        const oldIndex = workingOrder.indexOf(active.id as string);
        const newIndex = workingOrder.indexOf(over?.id as string);

        if (oldIndex === -1 || newIndex === -1) {
          console.warn('Category not found in order:', { active: active.id, over: over?.id, workingOrder });
          return workingOrder;
        }

        const newOrder = arrayMove(workingOrder, oldIndex, newIndex);
        console.log('New category order:', newOrder);
        return newOrder;
      });
    }
  };

  // Funções para lidar com drag-and-drop de produtos
  const handleProductDragEnd = (categoryName: string) => (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setProductOrder((prev) => {
        const categoryProducts = prev[categoryName] || [];
        const oldIndex = categoryProducts.indexOf(active.id as string);
        const newIndex = categoryProducts.indexOf(over?.id as string);

        return {
          ...prev,
          [categoryName]: arrayMove(categoryProducts, oldIndex, newIndex)
        };
      });
    }
  };

  const handleSave = () => {
    // Função removida - quantidades não são mais editadas nesta tela
  };

  const handleStartCount = () => {
    console.log("handleStartCount chamado - stockCount status:", stockCount?.status);
    console.log("stockCountId:", stockCountId);
    setIsStarting(true);
    startCountMutation.mutate();
  };

  const handleDeleteProduct = (productId: number) => {
    // Adicionar ao conjunto de produtos removidos para filtrar da interface
    setRemovedProducts(prev => new Set([...prev, productId]));
    
    // Remover da API se já foi salvo
    if (stockCount?.items?.some(item => item.productId === productId)) {
      deleteItemMutation.mutate(productId);
    } else {
      toast({
        title: "Produto removido",
        description: "Produto removido da contagem com sucesso",
      });
    }
  };

  // Funções para edição de quantidades
  const handleStartEditingQuantities = () => {
    // Inicializar com quantidades atuais
    const currentQuantities: Record<number, string> = {};
    
    stockCount.items?.forEach(item => {
      if (wasItemActuallyCounted(item) && item.countedQuantity !== null) {
        currentQuantities[item.productId] = item.countedQuantity;
      }
    });
    
    setEditedQuantities(currentQuantities);
    setIsEditingQuantities(true);
  };

  const handleCancelEditingQuantities = () => {
    setIsEditingQuantities(false);
    setEditedQuantities({});
  };

  const handleSaveQuantities = () => {
    saveQuantitiesMutation.mutate(editedQuantities);
  };

  const handleQuantityChange = (productId: number, quantity: string) => {
    setEditedQuantities(prev => ({
      ...prev,
      [productId]: quantity
    }));
  };

  // Helper function to check if an item was actually counted by the operator
  const wasItemActuallyCounted = (item: any) => {
    const createdAt = new Date(item.createdAt);
    const updatedAt = new Date(item.updatedAt);
    return updatedAt > createdAt || (item.countedQuantity && item.countedQuantity !== "0.000");
  };

  const getProductQuantity = (productId: number) => {
    if (isEditingQuantities) {
      return editedQuantities[productId] || "";
    }
    const item = stockCount.items?.find(item => item.productId === productId);
    if (!item) return "";
    
    return wasItemActuallyCounted(item) && item.countedQuantity !== null ? item.countedQuantity : "";
  };

  // Função para renderizar a timeline de status
  const getStatusTimeline = (currentStatus: string) => {
    const statuses = [
      { key: 'rascunho', label: 'Rascunho', icon: Pencil },
      { key: 'pronta_para_contagem', label: 'Pronta', icon: Send },
      { key: 'em_contagem', label: 'Em contagem', icon: Play },
      { key: 'contagem_finalizada', label: 'Finalizada', icon: CheckCircle }
    ];
    
    // Map 'started' status to 'pronta_para_contagem' for timeline display
    const mappedStatus = currentStatus === 'started' ? 'pronta_para_contagem' : currentStatus;
    const currentIndex = statuses.findIndex(s => s.key === mappedStatus);
    
    return (
      <div className="flex items-center space-x-2">
        {statuses.map((status, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const IconComponent = status.icon;
          
          return (
            <div key={status.key} className="flex items-center">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 ${
                isActive 
                  ? (isCurrent ? 'bg-orange-500 border-orange-500 text-white' : 'bg-green-500 border-green-500 text-white')
                  : 'bg-gray-200 border-gray-300 text-gray-400'
              }`}>
                <IconComponent className="h-3 w-3" />
              </div>
              {index < statuses.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${
                  index < currentIndex ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!stockCount) {
    return <div className="p-6">Contagem não encontrada</div>;
  }

  const statusBadgeColor = {
    draft: "secondary",
    rascunho: "secondary",
    started: "default", 
    completed: "outline"
  } as const;

  const statusText = {
    draft: "Rascunho",
    rascunho: "Rascunho",
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
          {(stockCount.status === "draft" || stockCount.status === "rascunho") && (
            <>
              <Button
                variant={isEditingOrder ? "default" : "outline"}
                onClick={() => {
                  if (isEditingOrder) {
                    // Salvar ordem antes de finalizar
                    saveOrderMutation.mutate({
                      categoryOrder,
                      productOrder
                    });
                  } else {
                    // Inicializar categoryOrder com ordem atual quando começar a editar
                    if (categoryOrder.length === 0) {
                      const currentCategories = Object.keys(productsByCategory);
                      setCategoryOrder(currentCategories);
                    }
                  }
                  setIsEditingOrder(!isEditingOrder);
                }}
                disabled={saveOrderMutation.isPending}
              >
                <GripVertical className="h-4 w-4 mr-2" />
                {isEditingOrder ? 
                  (saveOrderMutation.isPending ? "Salvando..." : "Finalizar Ordem") : 
                  "Editar Ordem"
                }
              </Button>
              {/* Botão de salvar removido - quantidades não são mais editadas aqui */}
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
          {stockCount.status === "contagem_finalizada" && (
            <>
              {isEditingQuantities ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancelEditingQuantities}
                    disabled={saveQuantitiesMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveQuantities}
                    disabled={saveQuantitiesMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveQuantitiesMutation.isPending ? "Salvando..." : "Salvar Quantidades"}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleStartEditingQuantities}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar Quantidades
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Status Timeline */}
          <div className="flex justify-center">
            <div className="w-full max-w-lg">
              <div className="flex justify-center">
                {getStatusTimeline(stockCount.status)}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {availableProducts.length}
              </div>
              <div className="text-sm text-gray-600">Produtos na Contagem</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {stockCount?.items?.filter(wasItemActuallyCounted).length || 0}
              </div>
              <div className="text-sm text-gray-600">Produtos Contados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {filteredAndOrderedData.length}
              </div>
              <div className="text-sm text-gray-600">Categorias Ativas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {(stockCount?.items?.length || 0) - (stockCount?.items?.filter(wasItemActuallyCounted).length || 0)}
              </div>
              <div className="text-sm text-gray-600">Não Contados</div>
            </div>
          </div>
          
          {/* Additional info */}
          <div className="flex justify-center items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center">
              <Building2 className="h-4 w-4 mr-1" />
              {stockCount.unit?.name}
            </div>
            {stockCount.publicToken && (
              <div className="flex items-center">
                <Globe className="h-4 w-4 mr-1" />
                Contagem Pública Ativa
              </div>
            )}
            {stockCount.items && stockCount.items.length > 0 && (
              <div className="flex items-center">
                <Save className="h-4 w-4 mr-1" />
                Última atualização: {format(new Date(stockCount.updatedAt || stockCount.createdAt), "dd/MM HH:mm", { locale: ptBR })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleCategoryDragEnd}
      >
        <SortableContext
          items={filteredAndOrderedData.map(item => item.category)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-6">
            {filteredAndOrderedData.map(({ category: categoryName, products: categoryProducts }) => (
              <SortableCategoryCard
                key={categoryName}
                categoryName={categoryName}
                categoryProducts={categoryProducts}
                isEditingOrder={isEditingOrder}
                isEditingQuantities={isEditingQuantities}
                previousOrder={previousOrder}
                stockCountStatus={stockCount.status}
                onProductDragEnd={handleProductDragEnd(categoryName)}
                productOrder={productOrder[categoryName] || []}
                onDeleteProduct={handleDeleteProduct}
                getProductQuantity={getProductQuantity}
                onQuantityChange={handleQuantityChange}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// Componente para item sortable de produto
interface SortableProductItemProps {
  product: Product;
  disabled: boolean;
  isEditingOrder: boolean;
  isEditingQuantities: boolean;
  quantity: string;
  onDelete: () => void;
  onQuantityChange: (quantity: string) => void;
}

function SortableProductItem({ 
  product, 
  disabled, 
  isEditingOrder, 
  isEditingQuantities, 
  quantity, 
  onDelete, 
  onQuantityChange 
}: SortableProductItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: product.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 py-2 px-3 border rounded-md"
    >
      {isEditingOrder && (
        <div className="flex justify-center">
          <div {...attributes} {...listeners} className="cursor-move">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      )}
      <div className="flex-1 font-medium text-sm">{product.name}</div>
      <div className="text-xs text-gray-500 w-20">{product.code}</div>
      <div className="text-xs text-gray-500 w-16">{product.unitOfMeasure || 'UN'}</div>
      
      {/* Campo de quantidade */}
      {isEditingQuantities ? (
        <Input
          type="text"
          value={quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
          placeholder="0"
          className="w-24 h-8 text-sm"
        />
      ) : (
        <div className="w-24 text-sm text-center font-medium">
          {quantity || "-"}
        </div>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={disabled}
        className={`h-8 w-8 p-0 ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-red-500 hover:text-red-700 hover:bg-red-50'}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Componente para categoria sortable
interface SortableCategoryCardProps {
  categoryName: string;
  categoryProducts: Product[];
  isEditingOrder: boolean;
  isEditingQuantities: boolean;
  previousOrder: any;
  stockCountStatus: string;
  onProductDragEnd: (event: DragEndEvent) => void;
  productOrder: string[];
  onDeleteProduct: (productId: number) => void;
  getProductQuantity: (productId: number) => string;
  onQuantityChange: (productId: number, quantity: string) => void;
}

function SortableCategoryCard({
  categoryName,
  categoryProducts,
  isEditingOrder,
  isEditingQuantities,
  previousOrder,
  stockCountStatus,
  onProductDragEnd,
  productOrder,
  onDeleteProduct,
  getProductQuantity,
  onQuantityChange
}: SortableCategoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: categoryName });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Ordenar produtos baseado na ordem customizada ou ordem original
  const orderedProducts = productOrder.length > 0 
    ? productOrder.map(productName => categoryProducts.find(p => p.name === productName)).filter(Boolean) as Product[]
    : categoryProducts;

  return (
    <div ref={setNodeRef} style={style}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {isEditingOrder && (
              <div {...attributes} {...listeners} className="cursor-move mr-2">
                <GripVertical className="h-5 w-5 text-gray-400" />
              </div>
            )}
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
          <DndContext
            sensors={useSensors(
              useSensor(PointerSensor),
              useSensor(KeyboardSensor, {
                coordinateGetter: sortableKeyboardCoordinates,
              })
            )}
            collisionDetection={closestCenter}
            onDragEnd={onProductDragEnd}
          >
            <SortableContext
              items={orderedProducts.map(p => p.name)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {orderedProducts.map((product) => (
                  <SortableProductItem
                    key={product.id}
                    product={product}
                    disabled={stockCountStatus !== "rascunho"}
                    isEditingOrder={isEditingOrder}
                    isEditingQuantities={isEditingQuantities}
                    quantity={getProductQuantity(product.id)}
                    onDelete={() => onDeleteProduct(product.id)}
                    onQuantityChange={(quantity) => onQuantityChange(product.id, quantity)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
}