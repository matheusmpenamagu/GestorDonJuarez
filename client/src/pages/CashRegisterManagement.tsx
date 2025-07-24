import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Calendar, Building2, Edit, Trash2, Upload, FileText } from "lucide-react";
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
      if (data.requiresManualCompletion) {
        // Data was parsed but needs manual unit selection
        onDataExtracted(data.parsedData);
        toast({
          title: "PDF processado com sucesso",
          description: "Dados extraídos. Complete as informações restantes.",
        });
      } else {
        // Complete data extracted
        onDataExtracted(data);
        toast({
          title: "PDF processado com sucesso",
          description: "Dados extraídos automaticamente do PDF.",
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

export default function CashRegisterManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClosure, setEditingClosure] = useState<CashRegisterClosure | null>(null);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<CashRegisterClosureFormData> | null>(null);
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

      {isLoading ? (
        <div className="text-center py-8">
          <p>Carregando fechamentos...</p>
        </div>
      ) : closures.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Nenhum fechamento de caixa encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {closures.map((closure) => (
            <Card key={closure.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      {format(new Date(closure.datetime), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {getUnitName(closure.unitId)}
                      </span>
                      {getOperationBadge(closure.operation)}
                      {getShiftBadge(closure.shift)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(closure)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(closure.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Fundo Inicial</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(closure.initialFund)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vendas Dinheiro</p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(closure.cashSales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vendas Débito</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(closure.debitSales || "0")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vendas Crédito</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(closure.creditSales || "0")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vendas PIX</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(closure.pixSales || "0")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Sangrias</p>
                    <p className="text-lg font-semibold text-red-600">
                      {formatCurrency(closure.withdrawals)}
                    </p>
                  </div>
                </div>

                {closure.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-500 mb-1">Observações</p>
                    <p className="text-sm text-gray-700">{closure.notes}</p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">Total Vendas</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(
                        parseFloat(closure.cashSales) +
                        parseFloat(closure.debitSales || "0") +
                        parseFloat(closure.creditSales || "0") +
                        parseFloat(closure.pixSales || "0")
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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