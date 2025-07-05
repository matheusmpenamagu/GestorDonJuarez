import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, FileText, Calendar, User, CheckCircle, Clock, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { StockCountWithRelations, InsertStockCount, Product, EmployeeWithRelations } from "@shared/schema";

export default function StockCountsManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCountDialogOpen, setIsCountDialogOpen] = useState(false);
  const [selectedStockCount, setSelectedStockCount] = useState<StockCountWithRelations | null>(null);
  const [countItems, setCountItems] = useState<{ productId: number; countedQuantity: string; notes?: string }[]>([]);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    responsibleId: "",
    notes: "",
  });

  const queryClient = useQueryClient();

  const { data: stockCounts = [], isLoading: isLoadingCounts } = useQuery<StockCountWithRelations[]>({
    queryKey: ["/api/stock-counts"],
  });

  const { data: employees = [] } = useQuery<EmployeeWithRelations[]>({
    queryKey: ["/api/employees"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertStockCount) => {
      return await apiRequest("POST", "/api/stock-counts", data);
    },
    onSuccess: async (stockCount: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-counts"] });
      
      // Initialize with all products
      try {
        await apiRequest("POST", `/api/stock-counts/${stockCount.id}/initialize`);
        setIsCreateDialogOpen(false);
        setFormData({
          date: format(new Date(), 'yyyy-MM-dd'),
          responsibleId: "",
          notes: "",
        });
        toast({
          title: "Contagem criada",
          description: "Contagem criada e inicializada com todos os produtos!",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Contagem criada mas houve erro ao inicializar produtos",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar contagem",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/stock-counts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-counts"] });
      toast({
        title: "Contagem excluída",
        description: "Contagem excluída com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir contagem",
        variant: "destructive",
      });
    },
  });

  const saveCountMutation = useMutation({
    mutationFn: async (data: { stockCountId: number; items: typeof countItems }) => {
      return await apiRequest("POST", `/api/stock-counts/${data.stockCountId}/items`, {
        items: data.items
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-counts"] });
      setIsCountDialogOpen(false);
      setSelectedStockCount(null);
      setCountItems([]);
      toast({
        title: "Contagem salva",
        description: "Contagem salva com sucesso!",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a proper date object for the selected date at midnight in local timezone
    const selectedDate = new Date(formData.date + 'T00:00:00');
    
    const stockCountData: InsertStockCount = {
      date: selectedDate,
      responsibleId: parseInt(formData.responsibleId),
      notes: formData.notes || null,
      status: "draft",
    };

    createMutation.mutate(stockCountData);
  };

  const handleStartCount = async (stockCount: StockCountWithRelations) => {
    try {
      // Fetch stock count details with items
      const response: any = await apiRequest("GET", `/api/stock-counts/${stockCount.id}`);
      setSelectedStockCount(response);
      
      // Initialize count items if they exist
      if (response.items && response.items.length > 0) {
        setCountItems(response.items.map((item: any) => ({
          productId: item.productId,
          countedQuantity: item.countedQuantity || "0",
          notes: item.notes || "",
        })));
      } else {
        // Initialize with all products at 0
        setCountItems(products.map((product: Product) => ({
          productId: product.id,
          countedQuantity: "0",
          notes: "",
        })));
      }
      
      setIsCountDialogOpen(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes da contagem",
        variant: "destructive",
      });
    }
  };

  const handleCountChange = (productId: number, field: 'countedQuantity' | 'notes', value: string) => {
    setCountItems(items => 
      items.map(item => 
        item.productId === productId 
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const handleSaveCount = () => {
    if (!selectedStockCount) return;
    
    saveCountMutation.mutate({
      stockCountId: selectedStockCount.id,
      items: countItems
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Rascunho</Badge>;
      case 'completed':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Concluída</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find((emp: any) => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Funcionário não encontrado';
  };

  if (isLoadingCounts) {
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
          <FileText className="h-6 w-6 text-orange-600" />
          <h1 className="text-2xl font-bold">Contagens de Estoque</h1>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Nova Contagem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Contagem</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data da Contagem</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsibleId">Responsável</Label>
                <Select
                  value={formData.responsibleId}
                  onValueChange={(value) => setFormData({ ...formData, responsibleId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee: any) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.firstName} {employee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações sobre a contagem..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-orange-600 hover:bg-orange-700"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Criando..." : "Criar Contagem"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockCounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  Nenhuma contagem cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              stockCounts.map((stockCount: any) => (
                <TableRow key={stockCount.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{format(new Date(stockCount.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{getEmployeeName(stockCount.responsibleId)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(stockCount.status)}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {stockCount.notes || "-"}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartCount(stockCount)}
                    >
                      <Eye className="h-4 w-4" />
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
                            Tem certeza que deseja excluir esta contagem?
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(stockCount.id)}
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

      {/* Stock Count Dialog */}
      <Dialog open={isCountDialogOpen} onOpenChange={setIsCountDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Contagem de Estoque - {selectedStockCount && format(new Date(selectedStockCount.date), 'dd/MM/yyyy', { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Un. Medida</TableHead>
                  <TableHead>Quantidade Contada</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product: any) => {
                  const countItem = countItems.find(item => item.productId === product.id);
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">{product.code}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.unitOfMeasure}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.001"
                          value={countItem?.countedQuantity || "0"}
                          onChange={(e) => handleCountChange(product.id, 'countedQuantity', e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={countItem?.notes || ""}
                          onChange={(e) => handleCountChange(product.id, 'notes', e.target.value)}
                          placeholder="Observações..."
                          className="w-32"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCountDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveCount}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={saveCountMutation.isPending}
            >
              {saveCountMutation.isPending ? "Salvando..." : "Salvar Contagem"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}