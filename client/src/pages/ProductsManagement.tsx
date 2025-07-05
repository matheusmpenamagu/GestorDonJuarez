import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Pencil, Trash2, Upload, Search, ArrowUpDown, ArrowUp, ArrowDown, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Product, InsertProduct, ProductCategory, InsertProductCategory } from "@shared/schema";

type SortField = 'code' | 'name' | 'stockCategory' | 'unit' | 'unitOfMeasure' | 'currentValue';
type SortDirection = 'asc' | 'desc';

export default function ProductsManagement() {
  const [activeTab, setActiveTab] = useState("products");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    stockCategory: "",
    unit: "",
    unitOfMeasure: "",
    currentValue: "",
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
  });

  const queryClient = useQueryClient();

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/product-categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProduct) => {
      return await apiRequest("/api/products", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Produto criado",
        description: "Produto criado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar produto: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProduct> }) => {
      return await apiRequest(`/api/products/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      resetForm();
      toast({
        title: "Produto atualizado",
        description: "Produto atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar produto: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/products/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Produto excluído",
        description: "Produto excluído com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir produto: " + error.message,
        variant: "destructive",
      });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: InsertProductCategory) => {
      return await apiRequest("/api/product-categories", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
      toast({
        title: "Categoria criada",
        description: "Categoria criada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar categoria: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProductCategory> }) => {
      return await apiRequest(`/api/product-categories/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
      resetCategoryForm();
      toast({
        title: "Categoria atualizada",
        description: "Categoria atualizada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar categoria: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/product-categories/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      toast({
        title: "Categoria excluída",
        description: "Categoria excluída com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir categoria: " + error.message,
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/products/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Erro no upload do arquivo');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast({
        title: "Upload concluído",
        description: `${data.created} produtos criados, ${data.updated} produtos atualizados!`,
      });
    },
    onError: (error) => {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast({
        title: "Erro no upload",
        description: "Erro ao processar arquivo: " + error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      stockCategory: "",
      unit: "",
      unitOfMeasure: "",
      currentValue: "",
    });
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: "",
      description: "",
    });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      stockCategory: product.stockCategory,
      unit: product.unit,
      unitOfMeasure: product.unitOfMeasure,
      currentValue: product.currentValue,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditCategory = (category: ProductCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || "",
    });
    setIsCategoryDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      ...formData,
      currentValue: parseFloat(formData.currentValue),
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: productData });
    } else {
      createMutation.mutate(productData);
    }
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: categoryFormData });
    } else {
      createCategoryMutation.mutate(categoryFormData);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo CSV ou Excel (.xlsx, .xls)",
          variant: "destructive",
        });
        return;
      }
      
      setIsUploading(true);
      uploadMutation.mutate(file);
    }
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
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Filter and sort products
  const filteredProducts = (products as Product[])
    .filter((product: Product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.stockCategory.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortField) {
        case 'currentValue':
          aValue = parseFloat(a.currentValue);
          bValue = parseFloat(b.currentValue);
          break;
        default:
          aValue = a[sortField]?.toLowerCase() || '';
          bValue = b[sortField]?.toLowerCase() || '';
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6 text-orange-600" />
          <h1 className="text-2xl font-bold">Gestão de Produtos</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Categorias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="border-orange-200 hover:bg-orange-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Enviando..." : "Upload Planilha"}
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Produto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Criar Produto</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Código</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Produto</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stockCategory">Categoria de Estoque</Label>
                      <Select
                        value={formData.stockCategory}
                        onValueChange={(value) => setFormData({ ...formData, stockCategory: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category: ProductCategory) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unidade</Label>
                      <Input
                        id="unit"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unitOfMeasure">Unidade de Medida</Label>
                      <Input
                        id="unitOfMeasure"
                        value={formData.unitOfMeasure}
                        onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentValue">Valor Atual (R$)</Label>
                      <Input
                        id="currentValue"
                        type="number"
                        step="0.01"
                        value={formData.currentValue}
                        onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          resetForm();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="bg-orange-600 hover:bg-orange-700"
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending ? "Criando..." : "Criar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar produtos por nome, código ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Products Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
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
                        onClick={() => handleSort('unit')}
                      >
                        Unidade {getSortIcon('unit')}
                      </Button>
                    </TableHead>
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
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {searchTerm ? "Nenhum produto encontrado com os critérios de busca." : "Nenhum produto cadastrado."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product: Product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono">{product.code}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.stockCategory}</TableCell>
                        <TableCell>{product.unit}</TableCell>
                        <TableCell>{product.unitOfMeasure}</TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(product.currentValue)}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o produto "{product.name}"?
                                  Esta ação não pode ser desfeita.
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
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Edit Product Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Produto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Código</Label>
                  <Input
                    id="edit-code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome do Produto</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stockCategory">Categoria de Estoque</Label>
                  <Select
                    value={formData.stockCategory}
                    onValueChange={(value) => setFormData({ ...formData, stockCategory: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category: ProductCategory) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-unit">Unidade</Label>
                  <Input
                    id="edit-unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-unitOfMeasure">Unidade de Medida</Label>
                  <Input
                    id="edit-unitOfMeasure"
                    value={formData.unitOfMeasure}
                    onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-currentValue">Valor Atual (R$)</Label>
                  <Input
                    id="edit-currentValue"
                    type="number"
                    step="0.01"
                    value={formData.currentValue}
                    onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="flex items-center justify-end">
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? "Editar Categoria" : "Criar Categoria"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Nome</Label>
                    <Input
                      id="category-name"
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category-description">Descrição</Label>
                    <Input
                      id="category-description"
                      value={categoryFormData.description}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                      placeholder="Descrição opcional da categoria"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCategoryDialogOpen(false);
                        setEditingCategory(null);
                        resetCategoryForm();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="bg-orange-600 hover:bg-orange-700"
                      disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                    >
                      {createCategoryMutation.isPending || updateCategoryMutation.isPending 
                        ? "Salvando..." 
                        : editingCategory ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Categories Table */}
          <div className="border rounded-lg overflow-hidden">
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
                  categories.map((category: ProductCategory) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.description || "-"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a categoria "{category.name}"?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteCategoryMutation.mutate(category.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}