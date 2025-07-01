import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Trash2, Wind, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { insertCo2RefillSchema, type Co2RefillWithRelations, type Unit } from "@shared/schema";
import { z } from "zod";

const formSchema = insertCo2RefillSchema.extend({
  date: z.string().min(1, "Data é obrigatória"),
});

type FormData = z.infer<typeof formSchema>;

interface Co2Stats {
  last30DaysTotal: { kg: number; cost: number };
  previous30DaysTotal: { kg: number; cost: number };
  percentageChange: number;
  kgPerLiterLast30Days: number;
  kgPerLiterPrevious30Days: number;
  efficiencyChange: number;
}

export default function Co2Management() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRefill, setEditingRefill] = useState<Co2RefillWithRelations | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: refills = [] } = useQuery<Co2RefillWithRelations[]>({
    queryKey: ["/api/co2-refills"],
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const { data: stats } = useQuery<Co2Stats>({
    queryKey: ["/api/co2-stats"],
  });

  const createForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      supplier: "",
      kilosRefilled: 0,
      valuePaid: 0,
      unitId: 0,
    },
  });

  const editForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: "",
      supplier: "",
      kilosRefilled: 0,
      valuePaid: 0,
      unitId: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const refillData = {
        ...data,
        date: new Date(data.date),
      };
      return await apiRequest("POST", "/api/co2-refills", refillData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/co2-refills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/co2-stats"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Recarga criada",
        description: "Recarga de CO2 criada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Falha ao criar recarga de CO2.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const refillData = {
        ...data,
        date: new Date(data.date),
      };
      return await apiRequest("PUT", `/api/co2-refills/${id}`, refillData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/co2-refills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/co2-stats"] });
      setIsEditDialogOpen(false);
      setEditingRefill(null);
      editForm.reset();
      toast({
        title: "Recarga atualizada",
        description: "Recarga de CO2 atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar recarga de CO2.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/co2-refills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/co2-refills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/co2-stats"] });
      toast({
        title: "Recarga excluída",
        description: "Recarga de CO2 excluída com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Falha ao excluir recarga de CO2.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (refill: Co2RefillWithRelations) => {
    setEditingRefill(refill);
    const refillDate = new Date(refill.date);
    editForm.reset({
      date: refillDate.toISOString().split('T')[0],
      supplier: refill.supplier,
      kilosRefilled: parseFloat(refill.kilosRefilled),
      valuePaid: parseFloat(refill.valuePaid),
      unitId: refill.unitId,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta recarga de CO2?")) {
      deleteMutation.mutate(id);
    }
  };

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatPercentage = (value: number) => {
    const isPositive = value >= 0;
    const formatted = Math.abs(value).toFixed(1);
    return { value: `${isPositive ? '+' : '-'}${formatted}%`, isPositive };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cards de estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Total de recargas dos últimos 30 dias */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recargas - Últimos 30 dias
              </CardTitle>
              <Wind className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(stats.last30DaysTotal.cost)}
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                {stats.last30DaysTotal.kg.toFixed(1)} kg de CO2
              </div>
              {stats.percentageChange !== 0 && (
                <div className="flex items-center">
                  {stats.percentageChange > 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                  )}
                  <Badge variant={stats.percentageChange > 0 ? "destructive" : "secondary"}>
                    {formatPercentage(stats.percentageChange).value}
                  </Badge>
                  <span className="text-sm text-muted-foreground ml-2">
                    vs período anterior
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Eficiência de CO2 por litro */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Eficiência CO2/L
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.kgPerLiterLast30Days.toFixed(3)} kg/L
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                CO2 por litro de chope
              </div>
              {stats.kgPerLiterPrevious30Days > 0 && (
                <div className="text-xs text-muted-foreground mb-1">
                  Período anterior: {stats.kgPerLiterPrevious30Days.toFixed(3)} kg/L
                </div>
              )}
              {stats.efficiencyChange !== 0 && (
                <div className="flex items-center">
                  {stats.efficiencyChange > 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                  )}
                  <Badge variant={stats.efficiencyChange > 0 ? "destructive" : "secondary"} className="text-xs">
                    {formatPercentage(stats.efficiencyChange).value}
                  </Badge>
                  <span className="text-sm text-muted-foreground ml-2">
                    vs período anterior
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wind className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Recargas de CO2</h1>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Recarga
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Recarga de CO2</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
                className="space-y-4"
              >
                <FormField
                  control={createForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornecedor</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do fornecedor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="kilosRefilled"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kilos de CO2</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="valuePaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Pago (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a unidade" />
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
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Criando..." : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Kilos CO2</TableHead>
              <TableHead>Valor Pago</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma recarga cadastrada
                </TableCell>
              </TableRow>
            ) : (
              refills.map((refill) => (
                <TableRow key={refill.id}>
                  <TableCell>{formatDate(refill.date)}</TableCell>
                  <TableCell>{refill.supplier}</TableCell>
                  <TableCell>{refill.kilosRefilled} kg</TableCell>
                  <TableCell>{formatCurrency(refill.valuePaid)}</TableCell>
                  <TableCell>{refill.unit?.name || "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(refill)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(refill.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Recarga de CO2</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) => 
                editingRefill && updateMutation.mutate({ id: editingRefill.id, data })
              )}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do fornecedor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="kilosRefilled"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kilos de CO2</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="valuePaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Pago (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <Select 
                      value={field.value?.toString()} 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a unidade" />
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
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}