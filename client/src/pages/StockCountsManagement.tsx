import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, FileText, Calendar, User, CheckCircle, Clock, Pencil, Trash2, Eye, Send, Play, StopCircle } from "lucide-react";
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
import type { StockCountWithRelations, InsertStockCount, Product, EmployeeWithRelations, Unit } from "@shared/schema";

// Function to get status badge variant and text
function getStatusInfo(status: string) {
  switch (status) {
    case 'rascunho':
      return { variant: 'secondary' as const, text: 'Rascunho', icon: Pencil };
    case 'pronta_para_contagem':
      return { variant: 'default' as const, text: 'Pronta para contagem', icon: Send };
    case 'em_contagem':
      return { variant: 'destructive' as const, text: 'Em contagem', icon: Play };
    case 'contagem_finalizada':
      return { variant: 'outline' as const, text: 'Finalizada', icon: CheckCircle };
    default:
      return { variant: 'secondary' as const, text: status, icon: Clock };
  }
}

export default function StockCountsManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCountDialogOpen, setIsCountDialogOpen] = useState(false);
  const [selectedStockCount, setSelectedStockCount] = useState<StockCountWithRelations | null>(null);
  const [countItems, setCountItems] = useState<{ productId: number; countedQuantity: string; notes?: string }[]>([]);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    responsibleId: "",
    unitId: "",
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

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertStockCount) => {
      const response = await apiRequest("POST", "/api/stock-counts", data);
      return await response.json();
    },
    onSuccess: async (stockCount: any) => {
      console.log("Stock count created:", stockCount);
      queryClient.invalidateQueries({ queryKey: ["/api/stock-counts"] });
      
      // Initialize with all products
      try {
        console.log("Initializing stock count with ID:", stockCount.id);
        await apiRequest("POST", `/api/stock-counts/${stockCount.id}/initialize`);
        setIsCreateDialogOpen(false);
        setFormData({
          date: format(new Date(), 'yyyy-MM-dd'),
          responsibleId: "",
          unitId: "",
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

  // Status transition mutations
  const fecharContagemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/stock-counts/${id}/fechar-contagem`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-counts"] });
      toast({
        title: "Contagem fechada",
        description: "Contagem fechada e enviada via WhatsApp com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao fechar contagem",
        variant: "destructive",
      });
    },
  });

  const finalizarContagemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/stock-counts/${id}/finalizar`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-counts"] });
      toast({
        title: "Contagem finalizada",
        description: "Contagem finalizada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao finalizar contagem",
        variant: "destructive",
      });
    },
  });

  const saveCountMutation = useMutation({
    mutationFn: async (data: { stockCountId: number; items: typeof countItems }) => {
      const response = await apiRequest("POST", `/api/stock-counts/${data.stockCountId}/items`, {
        items: data.items
      });
      return await response.json();
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
      unitId: parseInt(formData.unitId),
      notes: null,
      status: "rascunho",
    };

    createMutation.mutate(stockCountData);
  };

  const handleStartCount = async (stockCount: StockCountWithRelations) => {
    try {
      // Fetch stock count details with items
      const response = await apiRequest("GET", `/api/stock-counts/${stockCount.id}`);
      const stockCountData = await response.json();
      setSelectedStockCount(stockCountData);
      
      // Initialize count items if they exist
      if (stockCountData.items && stockCountData.items.length > 0) {
        setCountItems(stockCountData.items.map((item: any) => ({
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



  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find((emp: any) => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Funcionário não encontrado';
  };

  const getStatusTimeline = (currentStatus: string) => {
    const statuses = [
      { key: 'rascunho', label: 'Rascunho', icon: Pencil },
      { key: 'pronta_para_contagem', label: 'Pronta', icon: Send },
      { key: 'em_contagem', label: 'Em contagem', icon: Play },
      { key: 'contagem_finalizada', label: 'Finalizada', icon: CheckCircle }
    ];
    
    const currentIndex = statuses.findIndex(s => s.key === currentStatus);
    
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

  const getActionButtons = (stockCount: any) => {
    const { status, id } = stockCount;
    
    return (
      <div className="flex items-center justify-end space-x-2">
        {/* Visualizar sempre disponível */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.href = `/estoque/contagens/${id}`}
        >
          <Eye className="h-4 w-4" />
        </Button>

        {/* Botões específicos por status */}
        {status === 'rascunho' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fecharContagemMutation.mutate(id)}
            disabled={fecharContagemMutation.isPending}
            className="text-blue-600 hover:text-blue-700"
          >
            <Send className="h-4 w-4 mr-1" />
            Fechar contagem
          </Button>
        )}

        {status === 'em_contagem' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => finalizarContagemMutation.mutate(id)}
            disabled={finalizarContagemMutation.isPending}
            className="text-green-600 hover:text-green-700"
          >
            <StopCircle className="h-4 w-4 mr-1" />
            Finalizar
          </Button>
        )}

        {/* Editar e excluir apenas para rascunhos */}
        {status === 'rascunho' && (
          <>
            <Button variant="ghost" size="sm">
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir esta contagem? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate(id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    );
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
                <Label htmlFor="unitId">Unidade</Label>
                <Select
                  value={formData.unitId}
                  onValueChange={(value) => setFormData({ ...formData, unitId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit: any) => (
                      <SelectItem key={unit.id} value={unit.id.toString()}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <TableHead>Unidade</TableHead>
              <TableHead>Progresso</TableHead>
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
                  <TableCell>
                    <span>{stockCount.unit?.name || "N/A"}</span>
                  </TableCell>
                  <TableCell>
                    {getStatusTimeline(stockCount.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    {getActionButtons(stockCount)}
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