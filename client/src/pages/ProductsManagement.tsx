import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Plus, Pencil, Trash2, Upload, Package, Tag, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Product, ProductCategory, Unit } from "@shared/schema";

type SortField = 'code' | 'name' | 'stockCategory' | 'unitOfMeasure' | 'currentValue' | 'currentStock';
type SortDirection = 'asc' | 'desc';

type ProductWithUnits = Product & {
  associatedUnits?: Array<{
    unitId: number;
    unitName: string;
  }>;
  currentStock?: number;
  stockCountDate?: string;
  stockCountId?: number;
};

function ProductsManagementContent() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Upload state
  const [uploadResult, setUploadResult] = useState<{
    message: string;
    stats: { created: number; updated: number; errors: number; total: number };
    errors?: string[];
  } | null>(null);

  const queryClient = useQueryClient();

  const { data: products = [], isLoading: productsLoading } = useQuery<ProductWithUnits[]>({
    queryKey: ["/api/products"],
  });

  // Buscar estoque atual para os produtos
  const { data: currentStocks = [] } = useQuery<Array<{ 
    productId: number; 
    quantity: number; 
    countDate: string;
    stockCountId: number;
  }>>({
    queryKey: ["/api/products/current-stock"],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"],
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  // Helper functions to get names by ID
  const getCategoryName = (categoryId: number | string) => {
    const id = typeof categoryId === 'string' ? parseInt(categoryId) : categoryId;
    const category = categories.find((c: ProductCategory) => c.id === id);
    return category ? category.name : 'Categoria não encontrada';
  };

  const getUnitName = (unitId: number | string) => {
    const id = typeof unitId === 'string' ? parseInt(unitId) : unitId;
    const unit = units.find((u: Unit) => u.id === id);
    return unit ? unit.name : 'Unidade não encontrada';
  };

  // Adicionar estoque atual aos produtos
  const productsWithStock = products.map(product => {
    const stockData = currentStocks.find(stock => stock.productId === product.id);
    return {
      ...product,
      currentStock: stockData?.quantity || 0,
      stockCountDate: stockData?.countDate,
      stockCountId: stockData?.stockCountId
    };
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Produto excluído",
        description: "Produto excluído com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir produto",
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // Include authentication headers
      const storedSessionId = localStorage.getItem('sessionId');
      const headers: Record<string, string> = {};
      
      if (storedSessionId) {
        headers['Authorization'] = `Bearer ${storedSessionId}`;
      }
      
      const response = await fetch('/api/products/upload', {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include', // Include cookies for session-based auth
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      console.log("Upload successful:", result);
      setUploadResult(result);
      setIsUploading(false);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      
      toast({
        title: "Upload concluído",
        description: result.message,
      });
    },
    onError: (error: Error) => {
      console.error("Upload error:", error);
      setIsUploading(false);
      toast({
        title: "Erro no upload",
        description: error.message || "Erro ao fazer upload do arquivo",
        variant: "destructive",
      });
    },
  });

  const clearDatabaseMutation = useMutation({
    mutationFn: async () => {
      // Include authentication headers
      const storedSessionId = localStorage.getItem('sessionId');
      const headers: Record<string, string> = {};
      
      if (storedSessionId) {
        headers['Authorization'] = `Bearer ${storedSessionId}`;
      }
      
      const response = await fetch('/api/products/clear-all', {
        method: 'DELETE',
        headers,
        credentials: 'include', // Include cookies for session-based auth
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      console.log("Clear successful:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      
      toast({
        title: "Base de dados limpa",
        description: result.message,
      });
    },
    onError: (error: Error) => {
      console.error("Clear error:", error);
      toast({
        title: "Erro ao limpar",
        description: error.message || "Erro ao limpar a base de dados",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (product: Product) => {
    setLocation(`/estoque/produtos/editar/${product.id}`);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-3 w-3" /> : 
      <ChevronDown className="h-3 w-3" />;
  };

  const filteredProducts = productsWithStock.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCategoryName(product.stockCategory).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortField) {
      case 'stockCategory':
        aValue = getCategoryName(a.stockCategory).toLowerCase();
        bValue = getCategoryName(b.stockCategory).toLowerCase();
        break;
      case 'currentValue':
        aValue = parseFloat(a.currentValue.toString());
        bValue = parseFloat(b.currentValue.toString());
        break;
      case 'currentStock':
        aValue = a.currentStock || 0;
        bValue = b.currentStock || 0;
        break;
      default:
        aValue = a[sortField]?.toString().toLowerCase() || '';
        bValue = b[sortField]?.toString().toLowerCase() || '';
    }
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue || 0);
  };

  const formatQuantity = (quantity: number | undefined) => {
    if (quantity === undefined || quantity === null) return '-';
    
    // Se for número inteiro, mostrar sem casas decimais
    if (quantity % 1 === 0) {
      return quantity.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    
    // Se for número fracionado, mostrar com 3 casas decimais
    return quantity.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  };

  const formatStockDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name, "Size:", file.size, "Type:", file.type);
      
      if (!file.name.endsWith('.csv')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo CSV (.csv)",
          variant: "destructive",
        });
        return;
      }
      
      console.log("Starting upload...");
      setIsUploading(true);
      uploadMutation.mutate(file);
    }
  };

  if (productsLoading || categoriesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6 text-orange-600" />
          <h1 className="text-2xl font-bold">Produtos</h1>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => {
              if (confirm("Tem certeza que deseja limpar todos os produtos? Esta ação não pode ser desfeita.")) {
                clearDatabaseMutation.mutate();
              }
            }}
            disabled={clearDatabaseMutation.isPending}
            className="border-red-200 hover:bg-red-50 text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {clearDatabaseMutation.isPending ? "Limpando..." : "Limpar Base"}
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="border-orange-200 hover:bg-orange-50"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Enviando..." : "Upload Planilha"}
          </Button>
          <Button 
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => setLocation("/estoque/produtos/adicionar")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      {uploadResult && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">{uploadResult.message}</p>
          <p className="text-green-600 text-sm mt-1">
            Criados: {uploadResult.stats.created} | 
            Atualizados: {uploadResult.stats.updated} | 
            Erros: {uploadResult.stats.errors}
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort('code')}
                >
                  Código {getSortIcon('code')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort('name')}
                >
                  Nome {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort('stockCategory')}
                >
                  Categoria {getSortIcon('stockCategory')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort('currentStock')}
                >
                  Estoque Atual {getSortIcon('currentStock')}
                </Button>
              </TableHead>
              <TableHead>Min/Máx</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort('unitOfMeasure')}
                >
                  Un. Medida {getSortIcon('unitOfMeasure')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort('currentValue')}
                >
                  Valor Atual {getSortIcon('currentValue')}
                </Button>
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  {searchTerm ? "Nenhum produto encontrado com o termo pesquisado." : "Nenhum produto cadastrado."}
                </TableCell>
              </TableRow>
            ) : (
              sortedProducts.map((product) => (
                <TableRow key={product.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">{product.code}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                      {getCategoryName(product.stockCategory)}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">
                    {product.stockCountDate ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`font-medium cursor-help ${(product.currentStock || 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {formatQuantity(product.currentStock)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Última contagem: {formatStockDate(product.stockCountDate)}</p>
                            <p className="text-xs text-gray-500">Contagem #{product.stockCountId}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="font-medium text-gray-400">
                        {formatQuantity(product.currentStock)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <span className="text-gray-600">
                      {formatQuantity(product.minStock || undefined)}/{formatQuantity(product.maxStock || undefined)}
                    </span>
                  </TableCell>
                  <TableCell>{product.unitOfMeasure}</TableCell>
                  <TableCell className="font-mono">{formatCurrency(product.currentValue)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o produto "{product.name}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(product.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CategoriesTab() {
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/product-categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      setShowForm(false);
      setFormData({ name: "", description: "" });
      toast({
        title: "Categoria criada",
        description: "Categoria criada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar categoria",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; category: any }) => {
      return await apiRequest("PUT", `/api/product-categories/${data.id}`, data.category);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      setShowForm(false);
      setEditingCategory(null);
      toast({
        title: "Categoria atualizada",
        description: "Categoria atualizada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar categoria",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/product-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      toast({
        title: "Categoria excluída",
        description: "Categoria excluída com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir categoria",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        category: formData
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Tag className="h-6 w-6 text-orange-600" />
          <h2 className="text-xl font-semibold">Categorias de Produtos</h2>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium mb-4">
            {editingCategory ? "Editar Categoria" : "Nova Categoria"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Categoria</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-orange-600 hover:bg-orange-700"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : 
                 (editingCategory ? "Salvar Alterações" : "Criar Categoria")}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                  Nenhuma categoria cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.description || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a categoria "{category.name}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(category.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function ProductsManagement() {
  return (
    <div className="container mx-auto p-6">
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
        </TabsList>
        
        <TabsContent value="products">
          <ProductsManagementContent />
        </TabsContent>
        
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}