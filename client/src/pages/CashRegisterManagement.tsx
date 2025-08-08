import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Calendar, Building2, Edit, Trash2, Search, ChevronUp, ChevronDown, ArrowUpDown, TrendingUp, Clock } from "lucide-react";
import { format, startOfWeek, startOfDay, subDays, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

import type { CashRegisterClosure, Unit } from "@shared/schema";
import { insertCashRegisterClosureSchema } from "@shared/schema";
import type { z } from "zod";

type CashRegisterClosureFormData = z.infer<typeof insertCashRegisterClosureSchema>;



function CashRegisterForm({
  closure,
  onSuccess,
  initialData,
}: {
  closure?: CashRegisterClosure;
  onSuccess: () => void;
  initialData?: Partial<CashRegisterClosureFormData>;
}) {
  const { toast } = useToast();
  
  const form = useForm<CashRegisterClosureFormData>({
    resolver: zodResolver(insertCashRegisterClosureSchema),
    defaultValues: {
      datetime: initialData?.datetime || (closure?.datetime ? new Date(closure.datetime) : new Date()),
      unitId: initialData?.unitId || closure?.unitId || undefined,
      operation: initialData?.operation || closure?.operation || "salao",
      initialFund: initialData?.initialFund || (closure?.initialFund ? parseFloat(closure.initialFund) : 0),
      cashSales: initialData?.cashSales || (closure?.cashSales ? parseFloat(closure.cashSales) : 0),
      debitSales: initialData?.debitSales || (closure?.debitSales ? parseFloat(closure.debitSales) : 0),
      creditSales: initialData?.creditSales || (closure?.creditSales ? parseFloat(closure.creditSales) : 0),
      pixSales: initialData?.pixSales || (closure?.pixSales ? parseFloat(closure.pixSales) : 0),
      withdrawals: initialData?.withdrawals || (closure?.withdrawals ? parseFloat(closure.withdrawals) : 0),
      shift: initialData?.shift || closure?.shift || "dia",
      notes: initialData?.notes || closure?.notes || "",
      createdBy: "demo-user", // Will be replaced by actual user in backend
    },
  });

  // Get units for select
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['/api/units'],
  });

  const createMutation = useMutation({
    mutationFn: (data: CashRegisterClosureFormData) =>
      apiRequest("POST", "/api/cash-register-closures", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register-closures"] });
      toast({
        title: "Fechamento criado",
        description: "O fechamento de caixa foi criado com sucesso.",
      });
      onSuccess();
    },
    onError: (error) => {
      console.error("Error creating cash register closure:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o fechamento de caixa.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CashRegisterClosureFormData> }) =>
      apiRequest("PUT", `/api/cash-register-closures/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register-closures"] });
      toast({
        title: "Fechamento atualizado",
        description: "O fechamento de caixa foi atualizado com sucesso.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o fechamento de caixa.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CashRegisterClosureFormData) => {
    if (closure) {
      updateMutation.mutate({ id: closure.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="datetime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data e Hora *</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unitId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidade *</FormLabel>
                <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma unidade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id.toString()}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="operation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Operação *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="salao">Salão</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="shift"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Turno</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o turno" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="dia">Dia</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="noite">Noite</SelectItem>
                    <SelectItem value="madrugada">Madrugada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="initialFund"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fundo Inicial *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={field.value || 0}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cashSales"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendas em Dinheiro *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={field.value || 0}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="debitSales"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendas em Débito</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={field.value || 0}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="creditSales"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendas em Crédito</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={field.value || 0}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pixSales"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendas em PIX</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={field.value || 0}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="withdrawals"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sangrias *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={field.value || 0}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Observações sobre o fechamento..."
                  className="resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {closure ? "Atualizar" : "Criar"} Fechamento
          </Button>
        </div>
      </form>
    </Form>
  );
}

type SortField = 'datetime' | 'unitId' | 'operation' | 'totalSales' | 'cashSales' | 'shift';
type SortOrder = 'asc' | 'desc';

export default function CashRegisterManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClosure, setEditingClosure] = useState<CashRegisterClosure | null>(null);

  const [extractedData, setExtractedData] = useState<Partial<CashRegisterClosureFormData> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('datetime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterOperation, setFilterOperation] = useState<string>('all');
  const { toast } = useToast();

  // Fetch closures
  const { data: closures = [], isLoading } = useQuery<CashRegisterClosure[]>({
    queryKey: ['/api/cash-register-closures'],
  });

  // Fetch units for display
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['/api/units'],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/cash-register-closures/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register-closures'] });
      toast({
        title: "Fechamento excluído",
        description: "O fechamento de caixa foi excluído com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Delete mutation error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o fechamento de caixa.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (closure: CashRegisterClosure) => {
    setEditingClosure(closure);
    setExtractedData(null); // Clear any extracted data when editing
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este fechamento de caixa?")) {
      deleteMutation.mutate(id);
    }
  };



  const handleNewClosure = () => {
    setEditingClosure(null);
    setExtractedData(null);
    setIsDialogOpen(true);
  };

  const getUnitName = (unitId: number) => {
    const unit = units.find(u => u.id === unitId);
    return unit?.name || "Unidade não encontrada";
  };

  // Filtragem e ordenação dos fechamentos
  const filteredAndSortedClosures = useMemo(() => {
    let filtered = closures.filter(closure => {
      // Filtro de busca
      const searchMatch = searchTerm === "" || 
        getUnitName(closure.unitId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        closure.operation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (closure.shift && closure.shift.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (closure.notes && closure.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro por unidade
      const unitMatch = filterUnit === 'all' || closure.unitId.toString() === filterUnit;

      // Filtro por operação
      const operationMatch = filterOperation === 'all' || closure.operation === filterOperation;

      return searchMatch && unitMatch && operationMatch;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'datetime':
          aValue = new Date(a.datetime);
          bValue = new Date(b.datetime);
          break;
        case 'unitId':
          aValue = getUnitName(a.unitId);
          bValue = getUnitName(b.unitId);
          break;
        case 'operation':
          aValue = a.operation;
          bValue = b.operation;
          break;
        case 'shift':
          aValue = a.shift || '';
          bValue = b.shift || '';
          break;
        case 'cashSales':
          aValue = parseFloat(a.cashSales);
          bValue = parseFloat(b.cashSales);
          break;
        case 'totalSales':
          aValue = parseFloat(a.cashSales) + parseFloat(a.debitSales || "0") + 
                   parseFloat(a.creditSales || "0") + parseFloat(a.pixSales || "0");
          bValue = parseFloat(b.cashSales) + parseFloat(b.debitSales || "0") + 
                   parseFloat(b.creditSales || "0") + parseFloat(b.pixSales || "0");
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [closures, searchTerm, sortField, sortOrder, filterUnit, filterOperation, units]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortOrder === 'asc' ? 
      <ChevronUp className="ml-2 h-4 w-4" /> : 
      <ChevronDown className="ml-2 h-4 w-4" />;
  };

  const getOperationBadge = (operation: string) => {
    return (
      <Badge variant={operation === "salao" ? "default" : "secondary"}>
        {operation === "salao" ? "Salão" : "Delivery"}
      </Badge>
    );
  };

  const getShiftBadge = (shift: string | null) => {
    if (!shift) return null;
    return (
      <Badge variant="outline">
        {shift.charAt(0).toUpperCase() + shift.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  // Calcular somatórios por período
  const periodSummaries = useMemo(() => {
    const now = new Date();
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 }); // Segunda-feira
    const startOfLast30Days = subDays(startOfDay(now), 30);

    const thisWeekSummary: { [unitId: number]: number } = {};
    const last30DaysSummary: { [unitId: number]: number } = {};

    closures.forEach(closure => {
      const closureDate = new Date(closure.datetime);
      const totalSales = parseFloat(closure.cashSales) +
                        parseFloat(closure.debitSales || "0") +
                        parseFloat(closure.creditSales || "0") +
                        parseFloat(closure.pixSales || "0");
      const difference = parseFloat(closure.initialFund) + totalSales - parseFloat(closure.withdrawals);

      // Semana atual
      if (isWithinInterval(closureDate, { start: startOfThisWeek, end: now })) {
        thisWeekSummary[closure.unitId] = (thisWeekSummary[closure.unitId] || 0) + difference;
      }

      // Últimos 30 dias
      if (isWithinInterval(closureDate, { start: startOfLast30Days, end: now })) {
        last30DaysSummary[closure.unitId] = (last30DaysSummary[closure.unitId] || 0) + difference;
      }
    });

    return { thisWeekSummary, last30DaysSummary };
  }, [closures]);

  const getSummaryColor = (value: number) => {
    if (value === 0) return 'text-green-600';
    const absValue = Math.abs(value);
    if (absValue <= 10) return 'text-orange-500';
    return 'text-red-600';
  };

  const formatSummaryValue = (value: number) => {
    if (value === 0) return '✅';
    return formatCurrency(value);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fechamentos de Caixa</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gerencie os fechamentos de caixa das suas unidades
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleNewClosure}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Fechamento
          </Button>
          

        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClosure ? "Editar Fechamento" : "Novo Fechamento de Caixa"}
              </DialogTitle>
              <DialogDescription>
                {editingClosure ? "Edite as informações do fechamento" : "Registre um novo fechamento de caixa"}
              </DialogDescription>
            </DialogHeader>
            <CashRegisterForm 
              closure={editingClosure || undefined}
              initialData={extractedData || undefined}
              onSuccess={() => {
                setIsDialogOpen(false);
                setEditingClosure(null);
                setExtractedData(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Card: Nesta Semana */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              Nesta Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(periodSummaries.thisWeekSummary).length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum fechamento nesta semana</p>
              ) : (
                Object.entries(periodSummaries.thisWeekSummary).map(([unitId, difference]) => {
                  const unitName = getUnitName(parseInt(unitId));
                  return (
                    <div key={unitId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">{unitName}</span>
                      </div>
                      <span className={`text-sm font-mono font-bold ${
                        getSummaryColor(difference)
                      }`}>
                        {formatSummaryValue(difference)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card: Últimos 30 Dias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Últimos 30 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(periodSummaries.last30DaysSummary).length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum fechamento nos últimos 30 dias</p>
              ) : (
                Object.entries(periodSummaries.last30DaysSummary).map(([unitId, difference]) => {
                  const unitName = getUnitName(parseInt(unitId));
                  return (
                    <div key={unitId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">{unitName}</span>
                      </div>
                      <span className={`text-sm font-mono font-bold ${
                        getSummaryColor(difference)
                      }`}>
                        {formatSummaryValue(difference)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Filtros e Busca */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por unidade, operação, turno ou observações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <Select value={filterUnit} onValueChange={setFilterUnit}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as unidades</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterOperation} onValueChange={setFilterOperation}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filtrar por operação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="salao">Salão</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">
          <p>Carregando fechamentos...</p>
        </div>
      ) : filteredAndSortedClosures.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {closures.length === 0 
              ? "Nenhum fechamento de caixa encontrado." 
              : "Nenhum fechamento encontrado com os filtros aplicados."}
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('datetime')}
                    >
                      <div className="flex items-center">
                        Data/Hora
                        {getSortIcon('datetime')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('unitId')}
                    >
                      <div className="flex items-center">
                        Unidade
                        {getSortIcon('unitId')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('operation')}
                    >
                      <div className="flex items-center">
                        Operação
                        {getSortIcon('operation')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('shift')}
                    >
                      <div className="flex items-center">
                        Turno
                        {getSortIcon('shift')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Fundo Inicial</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('cashSales')}
                    >
                      <div className="flex items-center justify-end">
                        Dinheiro
                        {getSortIcon('cashSales')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">PIX</TableHead>
                    <TableHead className="text-right">Sangrias</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('totalSales')}
                    >
                      <div className="flex items-center justify-end">
                        Total Vendas
                        {getSortIcon('totalSales')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedClosures.map((closure) => {
                    const totalSales = parseFloat(closure.cashSales) +
                                     parseFloat(closure.debitSales || "0") +
                                     parseFloat(closure.creditSales || "0") +
                                     parseFloat(closure.pixSales || "0");
                    
                    // Cálculo da diferença: Fundo inicial + vendas - sangrias
                    const difference = parseFloat(closure.initialFund) + totalSales - parseFloat(closure.withdrawals);
                    
                    // Lógica de coloração e emoji para diferença
                    let differenceDisplay: string | React.ReactNode;
                    let differenceColorClass: string;
                    
                    if (difference === 0) {
                      differenceDisplay = '✅';
                      differenceColorClass = 'text-green-600';
                    } else {
                      const absValue = Math.abs(difference);
                      if (absValue <= 10) {
                        differenceColorClass = 'text-orange-500';
                      } else {
                        differenceColorClass = 'text-red-600';
                      }
                      differenceDisplay = formatCurrency(difference);
                    }
                    
                    return (
                      <TableRow key={closure.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-orange-600" />
                            <div>
                              <div className="font-medium">
                                {format(new Date(closure.datetime), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </div>
                              <div className="text-sm text-gray-500">
                                {format(new Date(closure.datetime), "HH:mm", {
                                  locale: ptBR,
                                })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">
                              {getUnitName(closure.unitId)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getOperationBadge(closure.operation)}
                        </TableCell>
                        <TableCell>
                          {getShiftBadge(closure.shift)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(closure.initialFund)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(closure.cashSales)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(closure.debitSales || "0")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(closure.creditSales || "0")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(closure.pixSales || "0")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(closure.withdrawals)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(totalSales)}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold ${
                          differenceColorClass
                        }`}>
                          {differenceDisplay}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(closure)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(closure.id)}
                              disabled={deleteMutation.isPending}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  );
}