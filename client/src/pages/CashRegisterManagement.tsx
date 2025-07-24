import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Calendar, Building2, DollarSign, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

import type { CashRegisterClosure, Unit } from "@shared/schema";
import { insertCashRegisterClosureSchema } from "@shared/schema";
import type { z } from "zod";

type CashRegisterClosureFormData = z.infer<typeof insertCashRegisterClosureSchema>;

function CashRegisterForm({
  closure,
  onSuccess,
}: {
  closure?: CashRegisterClosure;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  
  const form = useForm<CashRegisterClosureFormData>({
    resolver: zodResolver(insertCashRegisterClosureSchema),
    defaultValues: {
      datetime: closure?.datetime || new Date().toISOString().slice(0, 16),
      unitId: closure?.unitId || undefined,
      operationType: closure?.operationType || "salao",
      initialFund: closure?.initialFund || "0.00",
      cashSales: closure?.cashSales || "0.00",
      debitSales: closure?.debitSales || "0.00",
      creditSales: closure?.creditSales || "0.00",
      pixSales: closure?.pixSales || "0.00",
      withdrawals: closure?.withdrawals || "0.00",
      shift: closure?.shift || "dia",
      observations: closure?.observations || "",
    },
  });

  // Get units for select
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['/api/units'],
  });

  const createMutation = useMutation({
    mutationFn: (data: CashRegisterClosureFormData) =>
      apiRequest('/api/cash-register-closures', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register-closures'] });
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
    mutationFn: (data: CashRegisterClosureFormData) =>
      apiRequest(`/api/cash-register-closures/${closure!.id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-register-closures'] });
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
      updateMutation.mutate(data);
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
                    {...field}
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
            name="operationType"
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
                <Select onValueChange={field.onChange} value={field.value}>
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
                    {...field}
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
                    {...field}
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
                    {...field}
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
                    {...field}
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
                    {...field}
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
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Observações sobre o fechamento..."
                  className="resize-none"
                  {...field}
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
  const { toast } = useToast();

  // Get cash register closures
  const { data: closures = [], isLoading } = useQuery<CashRegisterClosure[]>({
    queryKey: ['/api/cash-register-closures'],
  });

  // Get units for display
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['/api/units'],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/cash-register-closures/${id}`, 'DELETE'),
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
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este fechamento de caixa?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingClosure(null);
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  const getOperationBadge = (type: string) => {
    return type === 'salao' ? (
      <Badge variant="default">Salão</Badge>
    ) : (
      <Badge variant="secondary">Delivery</Badge>
    );
  };

  const getShiftBadge = (shift: string) => {
    const shiftColors: Record<string, string> = {
      dia: "bg-yellow-100 text-yellow-800",
      tarde: "bg-orange-100 text-orange-800",
      noite: "bg-blue-100 text-blue-800",
      madrugada: "bg-purple-100 text-purple-800",
    };

    const shiftLabels: Record<string, string> = {
      dia: "Dia",
      tarde: "Tarde", 
      noite: "Noite",
      madrugada: "Madrugada",
    };

    return (
      <Badge className={shiftColors[shift]}>
        {shiftLabels[shift]}
      </Badge>
    );
  };

  const getUnitName = (unitId: number) => {
    const unit = units.find(u => u.id === unitId);
    return unit?.name || 'Unidade não encontrada';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando fechamentos de caixa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fechamentos de Caixa</h1>
          <p className="text-gray-600 mt-2">
            Gerencie os fechamentos de caixa das suas unidades
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="mr-2 h-4 w-4" />
              Novo Fechamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClosure ? "Editar Fechamento" : "Novo Fechamento de Caixa"}
              </DialogTitle>
              <DialogDescription>
                {editingClosure 
                  ? "Edite as informações do fechamento de caixa"
                  : "Preencha as informações para criar um novo fechamento de caixa"
                }
              </DialogDescription>
            </DialogHeader>
            <CashRegisterForm
              closure={editingClosure || undefined}
              onSuccess={handleDialogClose}
            />
          </DialogContent>
        </Dialog>
      </div>

      {closures.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum fechamento encontrado
            </h3>
            <p className="text-gray-600 text-center mb-4">
              Comece criando seu primeiro fechamento de caixa
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Fechamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
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
                      {getOperationBadge(closure.operationType)}
                      {closure.shift && getShiftBadge(closure.shift)}
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
                      {formatCurrency(closure.debitSales || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vendas Crédito</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(closure.creditSales || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vendas PIX</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(closure.pixSales || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Sangrias</p>
                    <p className="text-lg font-semibold text-red-600">
                      {formatCurrency(closure.withdrawals)}
                    </p>
                  </div>
                </div>

                {closure.observations && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-500 mb-1">Observações</p>
                    <p className="text-sm text-gray-700">{closure.observations}</p>
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
    </div>
  );
}