import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Calendar, Building2, Edit, Trash2, Upload, FileText, Search, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
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

// Component for PDF upload and parsing
function PDFUploadModal({
  isOpen,
  onClose,
  onDataExtracted,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDataExtracted: (data: Partial<CashRegisterClosureFormData>) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/cash-register-closures/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro no upload');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register-closures"] });
      
      if (data.success && data.closure) {
        // Record was created successfully
        toast({
          title: "Fechamento criado com sucesso",
          description: data.pdfMapping?.valuesExtracted 
            ? "PDF processado e todos os valores extraídos automaticamente."
            : "PDF processado e fechamento criado com valores padrão.",
        });
      } else {
        // Fallback for old behavior - data extraction only
        onDataExtracted(data.parsedData || data);
        toast({
          title: "PDF processado",
          description: "Complete as informações restantes.",
        });
      }
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro no processamento",
        description: error.message || "Não foi possível processar o PDF.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo PDF.",
        variant: "destructive",
      });
    }
  };

  const handleUpload = () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo PDF.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload de PDF - Fechamento de Caixa</DialogTitle>
          <DialogDescription>
            Faça upload de um PDF gerado pelo sistema ERP para extrair automaticamente os dados de fechamento.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <div className="text-sm text-gray-600">
                  Clique para selecionar ou arraste um arquivo PDF aqui
                </div>
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {file && (
                <div className="text-sm text-green-600 font-medium">
                  Arquivo selecionado: {file.name}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploadMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {uploadMutation.isPending ? "Processando..." : "Processar PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
      datetime: initialData?.datetime || closure?.datetime || new Date(),
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
      apiRequest("/api/cash-register-closures", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register-closures"] });
      toast({
        title: "Fechamento criado",
        description: "O fechamento de caixa foi criado com sucesso.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o fechamento de caixa.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CashRegisterClosureFormData> }) =>
      apiRequest(`/api/cash-register-closures/${id}`, "PUT", data),
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
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
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
    mutationFn: (id: number) => apiRequest(`/api/cash-register-closures/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register-closures'] });
      toast({
        title: "Fechamento excluído",
        description: "O fechamento de caixa foi excluído com sucesso.",
      });
    },
    onError: () => {
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

  const handlePDFDataExtracted = (data: Partial<CashRegisterClosureFormData>) => {
    setExtractedData(data);
    setIsPDFModalOpen(false);
    setIsDialogOpen(true);
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
          
          <Button
            onClick={() => setIsPDFModalOpen(true)}
            variant="outline"
            className="border-orange-600 text-orange-600 hover:bg-orange-50"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload PDF
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

      {/* Resumo Estatístico */}
      {filteredAndSortedClosures.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Resumo dos Fechamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {filteredAndSortedClosures.length}
                </p>
                <p className="text-sm text-gray-600">Fechamentos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    filteredAndSortedClosures.reduce((sum, closure) => 
                      sum + parseFloat(closure.cashSales), 0
                    )
                  )}
                </p>
                <p className="text-sm text-gray-600">Total Dinheiro</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    filteredAndSortedClosures.reduce((sum, closure) => 
                      sum + parseFloat(closure.debitSales || "0"), 0
                    )
                  )}
                </p>
                <p className="text-sm text-gray-600">Total Débito</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(
                    filteredAndSortedClosures.reduce((sum, closure) => 
                      sum + parseFloat(closure.creditSales || "0"), 0
                    )
                  )}
                </p>
                <p className="text-sm text-gray-600">Total Crédito</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">
                  {formatCurrency(
                    filteredAndSortedClosures.reduce((sum, closure) => 
                      sum + parseFloat(closure.pixSales || "0"), 0
                    )
                  )}
                </p>
                <p className="text-sm text-gray-600">Total PIX</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(
                    filteredAndSortedClosures.reduce((sum, closure) => 
                      sum + parseFloat(closure.cashSales) + 
                      parseFloat(closure.debitSales || "0") + 
                      parseFloat(closure.creditSales || "0") + 
                      parseFloat(closure.pixSales || "0"), 0
                    )
                  )}
                </p>
                <p className="text-sm text-gray-600">Total Geral</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedClosures.map((closure) => {
                    const totalSales = parseFloat(closure.cashSales) +
                                     parseFloat(closure.debitSales || "0") +
                                     parseFloat(closure.creditSales || "0") +
                                     parseFloat(closure.pixSales || "0");
                    
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
                        <TableCell className="text-right font-mono text-green-600 font-medium">
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
                        <TableCell className="text-right font-mono text-red-600 font-medium">
                          {formatCurrency(closure.withdrawals)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-green-700">
                          {formatCurrency(totalSales)}
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

      {/* PDF Upload Modal */}
      <PDFUploadModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        onDataExtracted={handlePDFDataExtracted}
      />
    </div>
  );
}