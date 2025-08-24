import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Package, TrendingUp, TrendingDown } from "lucide-react";

interface PurchaseFormProps {
  onSuccess?: () => void;
}

interface Product {
  id: number;
  name: string;
  code: string;
  stockCategory: string;
  unitOfMeasure: string;
  currentValue: string;
  lastPurchasePrice?: string;
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface Supplier {
  id: number;
  companyName: string;
  tradeName: string;
}

interface PurchaseItem {
  productId: number;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
}

const purchaseSchema = z.object({
  purchaseDate: z.string().min(1, "Data da compra é obrigatória"),
  responsibleId: z.number().min(1, "Responsável é obrigatório"),
  supplierId: z.number().min(1, "Fornecedor é obrigatório"),
  notes: z.string().optional(),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

function formatNumber(value: string): string {
  const num = parseFloat(value);
  return Number.isInteger(num) ? num.toString() : num.toFixed(3);
}

export function PurchaseForm({ onSuccess }: PurchaseFormProps) {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  // Buscar dados necessários
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products/purchase-eligible"],
  });

  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Definir usuário responsável padrão quando carregado
  useEffect(() => {
    if (currentUser?.id && !form.getValues("responsibleId")) {
      form.setValue("responsibleId", currentUser.id);
    }
  }, [currentUser, form]);

  const createPurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseFormData & { items: PurchaseItem[] }) => {
      const response = await apiRequest("POST", "/api/purchases", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Compra registrada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || error?.message || "Erro desconhecido";
      toast({
        title: "Erro ao registrar compra",
        description: message,
        variant: "destructive",
      });
    },
  });

  const addItem = () => {
    setItems([...items, {
      productId: 0,
      quantity: "",
      unitPrice: "",
      totalPrice: "0.00",
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: string) => {
    const newItems = [...items];
    
    // Converter productId para number
    if (field === "productId") {
      newItems[index] = { ...newItems[index], [field]: parseInt(value) || 0 };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    
    // Recalcular total quando quantity ou unitPrice mudarem
    if (field === "quantity" || field === "unitPrice") {
      const quantity = parseFloat(field === "quantity" ? value : newItems[index].quantity) || 0;
      const unitPrice = parseFloat(field === "unitPrice" ? value : newItems[index].unitPrice) || 0;
      newItems[index].totalPrice = (quantity * unitPrice).toFixed(2);
    }
    
    setItems(newItems);
  };

  const getSelectedProduct = (productId: number) => {
    return products?.find(p => p.id === productId);
  };

  const getPriceComparisonIcon = (currentPrice: string, lastPrice?: string) => {
    if (!lastPrice || !currentPrice || parseFloat(currentPrice) === 0) return null;
    
    const current = parseFloat(currentPrice);
    const last = parseFloat(lastPrice);
    
    if (current < last) {
      return <TrendingDown className="w-4 h-4 text-green-600" title="Preço menor que a última compra" />;
    } else if (current > last) {
      return <TrendingUp className="w-4 h-4 text-orange-600" title="Preço maior que a última compra" />;
    }
    return null;
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + parseFloat(item.totalPrice || "0"), 0);
  };

  const onSubmit = (data: PurchaseFormData) => {
    if (items.length === 0) {
      toast({
        title: "Adicione pelo menos um item",
        variant: "destructive",
      });
      return;
    }

    const validItems = items.filter(item => 
      item.productId > 0 && 
      parseFloat(item.quantity) > 0 && 
      parseFloat(item.unitPrice) > 0
    );

    if (validItems.length === 0) {
      toast({
        title: "Preencha todos os dados dos itens",
        variant: "destructive",
      });
      return;
    }

    createPurchaseMutation.mutate({
      ...data,
      items: validItems,
    });
  };

  const funcionarios = employees?.filter(emp => 
    Array.isArray(emp.employmentTypes) && emp.employmentTypes.includes("Funcionário")
  ) || [];

  return (
    <div className="space-y-6">
      <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Compra</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsibleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {funcionarios.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            {employee.firstName} {employee.lastName}
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
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o fornecedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers?.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.tradeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Itens da Compra</CardTitle>
                <Button type="button" onClick={addItem} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Item
                </Button>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum item adicionado
                  </p>
                ) : (
                  <div className="space-y-4">
                    {items.map((item, index) => {
                      const selectedProduct = getSelectedProduct(item.productId);
                      return (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
                          <div className="md:col-span-2">
                            <label className="text-sm font-medium">Produto</label>
                            <Select 
                              onValueChange={(value) => updateItem(index, "productId", value)}
                              value={item.productId.toString()}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o produto" />
                              </SelectTrigger>
                              <SelectContent>
                                {products?.map((product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.code} - {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Quantidade</label>
                            <Input
                              type="number"
                              step="0.001"
                              placeholder="0.000"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", e.target.value)}
                            />
                            {selectedProduct && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Unidade: {selectedProduct.unitOfMeasure}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="text-sm font-medium">Último Preço</label>
                            <div className="p-2 bg-gray-50 rounded text-sm text-muted-foreground">
                              {selectedProduct?.lastPurchasePrice 
                                ? formatCurrency(parseFloat(selectedProduct.lastPurchasePrice))
                                : "Sem histórico"}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Valor Unit.</label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                              />
                              {getPriceComparisonIcon(item.unitPrice, selectedProduct?.lastPurchasePrice)}
                            </div>
                          </div>

                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className="text-sm font-medium">Total</label>
                              <div className="p-2 bg-muted rounded text-sm">
                                {formatCurrency(parseFloat(item.totalPrice || "0"))}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {items.length > 0 && (
                      <div className="flex justify-end">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Total da Compra</div>
                          <div className="text-2xl font-bold text-orange-600">
                            {formatCurrency(getTotalAmount())}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações sobre a compra..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={createPurchaseMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {createPurchaseMutation.isPending ? "Salvando..." : "Registrar Compra"}
              </Button>
            </div>
          </form>
        </Form>
    </div>
  );
}