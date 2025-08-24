import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Store, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Supplier, InsertSupplier } from "@shared/schema";
import { insertSupplierSchema } from "@shared/schema";

const PAYMENT_METHOD_LABELS = {
  faturado_semanal: "Faturado semanal",
  faturado_mensal: "Faturado mensal", 
  pagamento_na_hora: "Pagamento na hora",
  pagamento_antecipado: "Pagamento antecipado"
};

const WEEKDAYS = [
  { value: "segunda", label: "Segunda-feira" },
  { value: "terça", label: "Terça-feira" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "quinta", label: "Quinta-feira" },
  { value: "sexta", label: "Sexta-feira" },
  { value: "sábado", label: "Sábado" },
  { value: "domingo", label: "Domingo" }
];

function formatCNPJ(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

type DeliveryDay = "segunda" | "terça" | "quarta" | "quinta" | "sexta" | "sábado" | "domingo";
type PaymentMethodType = "faturado_semanal" | "faturado_mensal" | "pagamento_na_hora" | "pagamento_antecipado";

function SupplierForm({ supplier, onClose }: { supplier?: Supplier; onClose: () => void }) {
  const { toast } = useToast();
  const [selectedDays, setSelectedDays] = useState<DeliveryDay[]>((supplier?.deliveryDays as DeliveryDay[]) || []);

  const form = useForm<InsertSupplier>({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      companyName: supplier?.companyName || "",
      tradeName: supplier?.tradeName || "",
      cnpj: supplier?.cnpj || "",
      deliveryDays: (supplier?.deliveryDays as DeliveryDay[]) || [],
      paymentMethod: (supplier?.paymentMethod as PaymentMethodType) || "faturado_mensal",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSupplier) => {
      const response = await apiRequest("POST", "/api/suppliers", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Fornecedor criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      onClose();
    },
    onError: (error: any) => {
      console.error("Erro detalhado ao criar fornecedor:", error);
      const message = error?.response?.data?.error || error?.message || "Erro desconhecido";
      const details = error?.response?.data?.details || [];
      
      toast({
        title: "Erro ao criar fornecedor",
        description: details.length > 0 ? `${message}: ${details[0]?.message}` : message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertSupplier) => {
      const response = await apiRequest("PUT", `/api/suppliers/${supplier?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Fornecedor atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      onClose();
    },
    onError: (error: any) => {
      console.error("Erro detalhado ao atualizar fornecedor:", error);
      const message = error?.response?.data?.error || error?.message || "Erro desconhecido";
      const details = error?.response?.data?.details || [];
      
      toast({
        title: "Erro ao atualizar fornecedor",
        description: details.length > 0 ? `${message}: ${details[0]?.message}` : message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertSupplier) => {
    const finalData = { ...data, deliveryDays: selectedDays };
    if (supplier) {
      updateMutation.mutate(finalData);
    } else {
      createMutation.mutate(finalData);
    }
  };

  const handleDayToggle = (day: DeliveryDay) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razão Social</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Nome empresarial oficial" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tradeName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Nome fantasia ou comercial" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ</FormLabel>
              <FormControl>
                <Input 
                  {...field}
                  placeholder="99.999.999/9999-99"
                  maxLength={18}
                  onChange={(e) => {
                    const formatted = formatCNPJ(e.target.value);
                    field.onChange(formatted);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Label>Dias de Entrega</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {WEEKDAYS.map((day) => (
              <div key={day.value} className="flex items-center space-x-2">
                <Checkbox
                  id={day.value}
                  checked={selectedDays.includes(day.value as DeliveryDay)}
                  onCheckedChange={() => handleDayToggle(day.value as DeliveryDay)}
                />
                <Label htmlFor={day.value} className="text-sm">{day.label}</Label>
              </div>
            ))}
          </div>
          {selectedDays.length === 0 && (
            <p className="text-sm text-red-600 mt-1">Selecione pelo menos um dia de entrega</p>
          )}
        </div>

        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Forma de Pagamento</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending || updateMutation.isPending || selectedDays.length === 0}
          >
            {supplier ? "Atualizar" : "Criar"} Fornecedor
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function SuppliersPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>();

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/suppliers/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Fornecedor excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir fornecedor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupplier(undefined);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-gray-600">Gerencie os fornecedores da empresa</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
              </DialogTitle>
            </DialogHeader>
            <SupplierForm supplier={editingSupplier} onClose={handleCloseDialog} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {suppliers?.map((supplier) => (
          <Card key={supplier.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-orange-500" />
                    <div>
                      <h3 className="font-semibold text-lg">{supplier.tradeName}</h3>
                      <p className="text-sm text-gray-600">{supplier.companyName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">CNPJ</Label>
                      <p className="font-mono text-sm">{supplier.cnpj}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Forma de Pagamento</Label>
                      <p className="text-sm">{PAYMENT_METHOD_LABELS[supplier.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS]}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-500">Dias de Entrega</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {supplier.deliveryDays.map((day) => (
                          <Badge key={day} variant="secondary" className="text-xs">
                            {WEEKDAYS.find(w => w.value === day)?.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(supplier)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(supplier.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {suppliers?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Store className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum fornecedor cadastrado
            </h3>
            <p className="text-gray-500 mb-4">
              Comece adicionando um fornecedor para gerenciar suas compras.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}