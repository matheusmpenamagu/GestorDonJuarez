import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Edit, Trash2, Calendar, QrCode, User, AlertTriangle, Clock, CalendarDays, Download, Check, X, Search, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LabelForm from "./LabelForm";
import LabelStatusCards from "@/components/LabelStatusCards";

interface Product {
  id: number;
  name: string;
  category: string;
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
}

interface ProductPortion {
  id: number;
  productId: number;
  quantity: number;
  unitOfMeasure: string;
}

interface Label {
  id: number;
  productId: number;
  responsibleId: number;
  date: string;
  portionId: number;
  expiryDate: string;
  storageMethod: string;
  identifier: string;
  withdrawalDate?: string | null;
  withdrawalResponsibleId?: number | null;
  createdAt: string;
  updatedAt: string;
}

type FilterType = 'all' | 'expiring_today' | 'expiring_tomorrow' | 'valid_week';

export default function LabelsTab() {
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedLabels, setSelectedLabels] = useState<Set<number>>(new Set());
  const [showBulkWithdrawalModal, setShowBulkWithdrawalModal] = useState(false);
  const [withdrawalDate, setWithdrawalDate] = useState(() => {
    const now = new Date();
    return format(now, "yyyy-MM-dd'T'HH:mm");
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State para tabela dinâmica avançada
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Label | 'productName' | 'responsibleName' | 'portionName';
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'withdrawn'>('all');

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products", { includeShelfLifeFilter: true }],
    queryFn: async () => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        headers['Authorization'] = `Bearer ${sessionId}`;
      }
      
      const response = await fetch('/api/products?includeShelfLifeFilter=true', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      return response.json();
    },
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: portions = [] } = useQuery<ProductPortion[]>({
    queryKey: ["/api/labels/portions"],
  });

  const { data: labels = [], isLoading } = useQuery<Label[]>({
    queryKey: ["/api/labels"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/labels/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId") || ""}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete label");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels"] });
      toast({
        title: "Etiqueta excluída",
        description: "Etiqueta excluída com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir etiqueta",
        variant: "destructive",
      });
    },
  });

  const bulkWithdrawalMutation = useMutation({
    mutationFn: async ({ labelIds, withdrawalDateTime }: { labelIds: number[], withdrawalDateTime: string }) => {
      const response = await fetch('/api/labels/bulk-withdrawal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("sessionId") || ""}`,
        },
        body: JSON.stringify({
          labelIds,
          withdrawalDateTime: new Date(withdrawalDateTime).toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha na baixa em massa das etiquetas');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels"] });
      setSelectedLabels(new Set());
      setShowBulkWithdrawalModal(false);
      toast({
        title: "Baixa realizada com sucesso!",
        description: `${data.processedCount} etiquetas processadas`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na baixa em massa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (label: Label) => {
    setEditingLabel(label);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta etiqueta?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingLabel(null);
  };

  // Handlers para seleção em massa
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const availableLabels = filteredLabels.filter(label => !label.withdrawalDate);
      setSelectedLabels(new Set(availableLabels.map(label => label.id)));
    } else {
      setSelectedLabels(new Set());
    }
  };

  const handleSelectLabel = (labelId: number, checked: boolean) => {
    const newSelectedLabels = new Set(selectedLabels);
    if (checked) {
      newSelectedLabels.add(labelId);
    } else {
      newSelectedLabels.delete(labelId);
    }
    setSelectedLabels(newSelectedLabels);
  };

  const handleBulkWithdrawal = () => {
    if (selectedLabels.size === 0) {
      toast({
        title: "Seleção necessária",
        description: "Selecione pelo menos uma etiqueta para dar baixa",
        variant: "destructive",
      });
      return;
    }
    setShowBulkWithdrawalModal(true);
  };

  const handleConfirmBulkWithdrawal = () => {
    bulkWithdrawalMutation.mutate({
      labelIds: Array.from(selectedLabels),
      withdrawalDateTime: withdrawalDate
    });
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || "Produto não encontrado";
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return "Funcionário não encontrado";
    return `${employee.firstName} ${employee.lastName}`;
  };

  const getPortion = (portionId: number) => {
    const portion = portions.find(p => p.id === portionId);
    if (!portion) return "Porção não encontrada";
    
    const unitDisplay = {
      'g': 'g',
      'kg': 'kg',
      'ml': 'ml',
      'l': 'l',
      'un': 'un',
      'fatias': 'fatias',
      'porções': 'porções'
    }[portion.unitOfMeasure] || portion.unitOfMeasure;
    
    return `${portion.quantity} ${unitDisplay}`;
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return expiry >= today && expiry <= tomorrow;
  };

  // Filter functions (reused from LabelStatusCards component logic)
  const isExpiringToday = (expiryDate: string) => {
    const expiry = startOfDay(new Date(expiryDate));
    const today = startOfDay(new Date());
    return expiry.getTime() <= today.getTime();
  };

  const isExpiringTomorrow = (expiryDate: string) => {
    const expiry = startOfDay(new Date(expiryDate));
    const tomorrow = startOfDay(addDays(new Date(), 1));
    return expiry.getTime() === tomorrow.getTime();
  };

  const isValidMoreThan7Days = (expiryDate: string) => {
    const expiry = startOfDay(new Date(expiryDate));
    const weekFromNow = startOfDay(addDays(new Date(), 7));
    return expiry.getTime() > weekFromNow.getTime();
  };

  // Funções de busca e ordenação avançadas
  const getSortableValue = (label: Label, key: string) => {
    switch (key) {
      case 'productName':
        return getProductName(label.productId);
      case 'responsibleName':
        return getEmployeeName(label.responsibleId);
      case 'portionName':
        return getPortion(label.portionId);
      default:
        return label[key as keyof Label];
    }
  };

  const handleSort = (key: keyof Label | 'productName' | 'responsibleName' | 'portionName') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Filter, search and sort labels with advanced features
  const filteredAndSortedLabels = labels
    .filter(label => {
      // Filter by expiry date
      let expiryMatch = true;
      switch (activeFilter) {
        case 'expiring_today':
          expiryMatch = isExpiringToday(label.expiryDate);
          break;
        case 'expiring_tomorrow':
          expiryMatch = isExpiringTomorrow(label.expiryDate);
          break;
        case 'valid_week':
          expiryMatch = isValidMoreThan7Days(label.expiryDate);
          break;
        default:
          expiryMatch = true;
      }

      // Filter by status
      let statusMatch = true;
      switch (statusFilter) {
        case 'available':
          statusMatch = !label.withdrawalDate;
          break;
        case 'withdrawn':
          statusMatch = !!label.withdrawalDate;
          break;
        default:
          statusMatch = true;
      }

      // Search filter
      const searchMatch = searchTerm === "" || 
        label.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getProductName(label.productId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getEmployeeName(label.responsibleId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getPortion(label.portionId).toLowerCase().includes(searchTerm.toLowerCase());

      return expiryMatch && statusMatch && searchMatch;
    })
    .sort((a, b) => {
      // Primary sort: withdrawn status (available first unless sorting by other fields)
      if (!sortConfig) {
        if (a.withdrawalDate && !b.withdrawalDate) return 1;
        if (!a.withdrawalDate && b.withdrawalDate) return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      // Custom sorting
      const aValue = getSortableValue(a, sortConfig.key);
      const bValue = getSortableValue(b, sortConfig.key);
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedLabels.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLabels = filteredAndSortedLabels.slice(startIndex, startIndex + itemsPerPage);

  // For compatibility with existing code
  const filteredLabels = paginatedLabels;

  const getStorageMethodDisplay = (storageMethod: string) => {
    const methods = {
      'congelado': { icon: '🧊', label: 'Congelado' },
      'resfriado': { icon: '❄️', label: 'Resfriado' },
      'temperatura_ambiente': { icon: '🌡️', label: 'Ambiente' }
    };
    
    const method = methods[storageMethod as keyof typeof methods];
    return method ? { icon: method.icon, label: method.label } : { icon: '❓', label: 'Desconhecido' };
  };



  if (isLoading) {
    return <div>Carregando etiquetas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Etiquetas Geradas</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Visualize e gerencie todas as etiquetas criadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedLabels.size > 0 && (
            <Button
              onClick={handleBulkWithdrawal}
              variant="destructive"
              className="flex items-center gap-2"
              disabled={bulkWithdrawalMutation.isPending}
            >
              <Download className="w-4 h-4" />
              Baixar Selecionadas ({selectedLabels.size})
            </Button>
          )}
          <Button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Gerar Etiqueta
          </Button>
        </div>
      </div>

      {/* Advanced Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por identificador, produto, responsável ou porção..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <div className="flex gap-1">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Todos ({filteredAndSortedLabels.length})
              </Button>
              <Button
                variant={statusFilter === 'available' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('available')}
              >
                Disponíveis ({labels.filter(l => !l.withdrawalDate).length})
              </Button>
              <Button
                variant={statusFilter === 'withdrawn' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('withdrawn')}
              >
                Baixadas ({labels.filter(l => !!l.withdrawalDate).length})
              </Button>
            </div>
          </div>

          {/* Items per page */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Por página:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Filter indicator */}
        {(activeFilter !== 'all' || searchTerm || statusFilter !== 'all') && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilter !== 'all' && (
              <Badge variant="outline" className="flex items-center gap-1">
                {activeFilter === 'expiring_today' && <AlertTriangle className="w-3 h-3 text-red-600" />}
                {activeFilter === 'expiring_tomorrow' && <Clock className="w-3 h-3 text-yellow-600" />}
                {activeFilter === 'valid_week' && <CalendarDays className="w-3 h-3 text-green-600" />}
                Vencimento: {
                  activeFilter === 'expiring_today' ? 'Hoje' :
                  activeFilter === 'expiring_tomorrow' ? 'Amanhã' :
                  '+7 dias'
                }
                <X className="w-3 h-3 cursor-pointer" onClick={() => setActiveFilter('all')} />
              </Badge>
            )}
            {searchTerm && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Search className="w-3 h-3" />
                Busca: "{searchTerm}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchTerm('')} />
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge variant="outline" className="flex items-center gap-1">
                Status: {statusFilter === 'available' ? 'Disponíveis' : 'Baixadas'}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setStatusFilter('all')} />
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setActiveFilter('all');
                setSearchTerm('');
                setStatusFilter('all');
                setSortConfig(null);
              }}
              className="h-6 px-2 text-xs"
            >
              Limpar todos os filtros
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {labels.length === 0 ? (
        <Alert>
          <AlertDescription>
            Nenhuma etiqueta gerada. Clique em "Gerar Etiqueta" para começar.
          </AlertDescription>
        </Alert>
      ) : filteredLabels.length === 0 ? (
        <Alert>
          <AlertDescription>
            Nenhuma etiqueta encontrada para o filtro selecionado.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedLabels.size > 0 && selectedLabels.size === filteredLabels.filter(label => !label.withdrawalDate).length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    disabled={filteredLabels.filter(label => !label.withdrawalDate).length === 0}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('identifier')}
                >
                  <div className="flex items-center gap-1">
                    Identificador
                    {sortConfig?.key === 'identifier' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-50" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('productName')}
                >
                  <div className="flex items-center gap-1">
                    Produto
                    {sortConfig?.key === 'productName' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-50" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('portionName')}
                >
                  <div className="flex items-center gap-1">
                    Porção
                    {sortConfig?.key === 'portionName' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-50" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('storageMethod')}
                >
                  <div className="flex items-center gap-1">
                    Armazenamento
                    {sortConfig?.key === 'storageMethod' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-50" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('responsibleName')}
                >
                  <div className="flex items-center gap-1">
                    Responsável
                    {sortConfig?.key === 'responsibleName' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-50" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Data Produção
                    {sortConfig?.key === 'date' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-50" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('expiryDate')}
                >
                  <div className="flex items-center gap-1">
                    Vencimento
                    {sortConfig?.key === 'expiryDate' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-50" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLabels.map((label) => (
                <TableRow key={label.id} className={label.withdrawalDate ? "opacity-60" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedLabels.has(label.id)}
                      onCheckedChange={(checked) => handleSelectLabel(label.id, !!checked)}
                      disabled={!!label.withdrawalDate}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <QrCode className="w-3 h-3" />
                      {label.identifier}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {getProductName(label.productId)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getPortion(label.portionId)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span>{getStorageMethodDisplay(label.storageMethod).icon}</span>
                      <span className="text-sm">{getStorageMethodDisplay(label.storageMethod).label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {getEmployeeName(label.responsibleId)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(label.date), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        isExpired(label.expiryDate) 
                          ? "destructive" 
                          : isExpiringSoon(label.expiryDate) 
                            ? "secondary" 
                            : "outline"
                      }
                      className="flex items-center gap-1 w-fit"
                    >
                      <Calendar className="w-3 h-3" />
                      {format(new Date(label.expiryDate), "dd/MM/yyyy", { locale: ptBR })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {label.withdrawalDate ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit cursor-help">
                            <Check className="w-3 h-3" />
                            Baixada
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <div><strong>Data:</strong> {format(new Date(label.withdrawalDate), "dd/MM/yyyy", { locale: ptBR })}</div>
                            <div><strong>Hora:</strong> {format(new Date(label.withdrawalDate), "HH:mm", { locale: ptBR })}</div>
                            {label.withdrawalResponsibleId && (
                              <div><strong>Responsável:</strong> {getEmployeeName(label.withdrawalResponsibleId)}</div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Clock className="w-3 h-3" />
                        Disponível
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {!label.withdrawalDate ? (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(label)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(label.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">
                        Baixada
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-500">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredAndSortedLabels.length)} de {filteredAndSortedLabels.length} etiquetas
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  Primeira
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === totalPages || 
                      Math.abs(page - currentPage) <= 2
                    )
                    .map((page, index, array) => {
                      if (index > 0 && array[index - 1] !== page - 1) {
                        return (
                          <div key={`ellipsis-${page}`} className="flex items-center gap-1">
                            <span className="text-gray-400">...</span>
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          </div>
                        );
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Última
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <LabelForm
        open={showForm}
        onOpenChange={handleFormClose}
        label={editingLabel}
        products={products}
        portions={portions}
      />

      {/* Bulk Withdrawal Modal */}
      <Dialog open={showBulkWithdrawalModal} onOpenChange={setShowBulkWithdrawalModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Baixar Etiquetas em Massa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Você está prestes a dar baixa em <strong>{selectedLabels.size}</strong> etiqueta(s) selecionada(s).
            </div>
            
            <div className="space-y-2">
              <UILabel htmlFor="withdrawalDateTime">Data e Hora da Baixa</UILabel>
              <Input
                id="withdrawalDateTime"
                type="datetime-local"
                value={withdrawalDate}
                onChange={(e) => setWithdrawalDate(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-400">
              O responsável pela baixa será registrado como o usuário logado.
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkWithdrawalModal(false)}
              disabled={bulkWithdrawalMutation.isPending}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmBulkWithdrawal}
              disabled={bulkWithdrawalMutation.isPending}
            >
              <Check className="w-4 h-4 mr-2" />
              {bulkWithdrawalMutation.isPending ? "Processando..." : "Confirmar Baixa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}