import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { format, addDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, QrCode, Calendar, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  employmentTypes: string[];
  type: string;
}

interface Product {
  id: number;
  name: string;
  category: string;
}

interface Employee {
  id: number;
  name: string;
}

interface ProductPortion {
  id: number;
  productId: number;
  quantity: number;
  unitOfMeasure: string;
}

interface ProductShelfLife {
  id: number;
  productId: number;
  frozenDays: number;
  chilledDays: number;
  roomTemperatureDays: number;
}

interface Unit {
  id: number;
  name: string;
  address: string;
  cnpj?: string;
}

interface Label {
  id: number;
  productId: number;
  responsibleId: number;
  unitId: number;
  date: string;
  portionId: number;
  expiryDate: string;
  storageMethod: string;
  identifier: string;
}

interface LabelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label?: Label | null;
  products: Product[];
  portions: ProductPortion[];
}

const labelSchema = z.object({
  unitId: z.number({ required_error: "Selecione uma unidade" }).optional().refine(val => val !== undefined, "Selecione uma unidade"),
  productId: z.number({ required_error: "Selecione um produto" }),
  date: z.string().min(1, "Data é obrigatória"),
  portionId: z.number({ required_error: "Selecione uma porção" }),
  expiryDate: z.string().min(1, "Data de vencimento é obrigatória"),
  storageMethod: z.enum(["congelado", "resfriado", "temperatura_ambiente"], {
    required_error: "Selecione uma forma de armazenamento",
  }),
});

type LabelFormData = z.infer<typeof labelSchema>;

export default function LabelForm({
  open,
  onOpenChange,
  label,
  products,
  portions,
}: LabelFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth() as { user: User | null };
  const isEditing = !!label;

  const form = useForm<LabelFormData>({
    resolver: zodResolver(labelSchema),
    defaultValues: label ? {
      unitId: label.unitId,
      productId: label.productId,
      date: label.date ? format(new Date(label.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      portionId: label.portionId,
      expiryDate: label.expiryDate ? format(new Date(label.expiryDate), "yyyy-MM-dd") : "",
      storageMethod: label.storageMethod as "congelado" | "resfriado" | "temperatura_ambiente",
    } : {
      unitId: undefined, // No default unit - user must select
      productId: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      portionId: 0,
      expiryDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      storageMethod: "temperatura_ambiente" as const,
    },
  });

  // Fetch shelf lifes data
  const { data: shelfLifes = [] } = useQuery<ProductShelfLife[]>({
    queryKey: ["/api/labels/shelf-lifes"],
  });

  // Fetch units data
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const selectedProductId = form.watch("productId");
  const selectedUnitId = form.watch("unitId");
  const selectedStorageMethod = form.watch("storageMethod");
  const selectedDate = form.watch("date");

  // Fetch products filtered by selected unit
  const { data: filteredProducts = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products", selectedUnitId],
    queryFn: async () => {
      const params = new URLSearchParams({
        includeShelfLifeFilter: "true"
      });
      
      if (selectedUnitId) {
        params.append("unitId", selectedUnitId.toString());
      }
      
      // Use the same authentication as other queries
      const storedSessionId = localStorage.getItem('sessionId');
      const headers: Record<string, string> = {};
      
      if (storedSessionId) {
        headers['Authorization'] = `Bearer ${storedSessionId}`;
      }
      
      const res = await fetch(`/api/products?${params}`, {
        credentials: "include",
        headers,
      });
      
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      
      return res.json();
    },
    enabled: !!selectedUnitId, // Only fetch when unit is selected
  });

  const availablePortions = (portions || []).filter(p => p.productId === selectedProductId);
  
  // Get shelf life for selected product
  const selectedProductShelfLife = (shelfLifes || []).find(sl => sl.productId === selectedProductId);

  // Function to calculate expiry date based on storage method
  const calculateExpiryDate = (productId: number, storageMethod: string, baseDate: string) => {
    const shelfLife = (shelfLifes || []).find((sl: ProductShelfLife) => sl.productId === productId);
    if (!shelfLife || !baseDate) return "";

    const daysToAdd = {
      'congelado': shelfLife.frozenDays,
      'resfriado': shelfLife.chilledDays,
      'temperatura_ambiente': shelfLife.roomTemperatureDays
    }[storageMethod];

    if (!daysToAdd) return "";

    const expiryDate = addDays(new Date(baseDate), daysToAdd);
    return format(expiryDate, "yyyy-MM-dd");
  };

  // Function to get storage option display with days
  const getStorageOptionDisplay = (method: string, shelfLife: ProductShelfLife | undefined) => {
    const methodInfo = {
      'congelado': { icon: '🧊', label: 'Congelado' },
      'resfriado': { icon: '❄️', label: 'Resfriado' },
      'temperatura_ambiente': { icon: '🌡️', label: 'Temperatura Ambiente' }
    }[method];

    if (!methodInfo || !shelfLife) {
      return methodInfo ? `${methodInfo.icon} ${methodInfo.label}` : method;
    }

    const days = {
      'congelado': shelfLife.frozenDays,
      'resfriado': shelfLife.chilledDays,
      'temperatura_ambiente': shelfLife.roomTemperatureDays
    }[method];

    return `${methodInfo.icon} ${methodInfo.label} (${days} dias)`;
  };

  useEffect(() => {
    if (label) {
      form.reset({
        unitId: label.unitId,
        productId: label.productId,
        date: format(new Date(label.date), "yyyy-MM-dd"),
        portionId: label.portionId,
        expiryDate: format(new Date(label.expiryDate), "yyyy-MM-dd"),
        storageMethod: label.storageMethod as "congelado" | "resfriado" | "temperatura_ambiente",
      });
    } else {
      const today = format(new Date(), "yyyy-MM-dd");
      form.reset({
        unitId: 1, // Don Juarez Grão Pará como padrão
        productId: 0,
        date: today,
        portionId: 0,
        expiryDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
        storageMethod: "temperatura_ambiente" as const,
      });
    }
  }, [label, form]);

  // Reset product when unit changes (only for new labels)
  useEffect(() => {
    if (selectedUnitId && !isEditing) {
      form.setValue("productId", 0);
      form.setValue("portionId", 0);
    }
  }, [selectedUnitId, isEditing, form]);

  // Reset portion when product changes
  useEffect(() => {
    if (selectedProductId && !isEditing) {
      form.setValue("portionId", 0);
    }
  }, [selectedProductId, isEditing, form]);

  // Auto-calculate expiry date when product, storage method, or date changes
  useEffect(() => {
    if (selectedProductId && selectedStorageMethod && selectedDate && !isEditing) {
      const calculatedExpiryDate = calculateExpiryDate(selectedProductId, selectedStorageMethod, selectedDate);
      if (calculatedExpiryDate) {
        form.setValue("expiryDate", calculatedExpiryDate);
      }
    }
  }, [selectedProductId, selectedStorageMethod, selectedDate, shelfLifes, isEditing, form, calculateExpiryDate]);

  // Ensure date is always today when form opens for new labels
  useEffect(() => {
    if (!isEditing && open) {
      const today = format(new Date(), "yyyy-MM-dd");
      form.setValue("date", today);
    }
  }, [open, isEditing, form]);

  const mutation = useMutation({
    mutationFn: async (data: LabelFormData) => {
      if (!user?.id) {
        throw new Error("Usuário não autenticado");
      }

      const url = isEditing
        ? `/api/labels/${label!.id}`
        : "/api/labels";
      const method = isEditing ? "PUT" : "POST";

      const payload = {
        ...data,
        responsibleId: user.id,
        date: new Date(data.date + "T00:00:00"),
        expiryDate: new Date(data.expiryDate + "T23:59:59"),
      };

      const response = await apiRequest(method, url, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels"] });
      toast({
        title: isEditing ? "Etiqueta atualizada" : "Etiqueta gerada",
        description: isEditing 
          ? "Etiqueta atualizada com sucesso" 
          : "Etiqueta gerada com sucesso",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving label:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar etiqueta",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LabelFormData) => {
    mutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const getPortionDisplay = (portion: ProductPortion) => {
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            {isEditing ? "Editar Etiqueta" : "Gerar Nova Etiqueta"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Edite as informações da etiqueta" 
              : "Preencha os dados para gerar uma nova etiqueta com identificador único"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="unitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Unidade
                  </FormLabel>
                  <Select 
                    value={field.value ? field.value.toString() : ""} 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          isEditing ? "Unidade (não editável)" : "Selecione uma unidade"
                        } />
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
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto</FormLabel>
                  <Select 
                    value={field.value ? field.value.toString() : ""} 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    disabled={!isEditing && (!selectedUnitId || isLoadingProducts || (Array.isArray(filteredProducts) && filteredProducts.length === 0))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          isEditing
                            ? "Selecione um produto"
                            : !selectedUnitId 
                              ? "Selecione uma unidade primeiro" 
                              : isLoadingProducts
                                ? "Carregando produtos..."
                                : (Array.isArray(filteredProducts) && filteredProducts.length === 0)
                                  ? "Nenhum produto disponível para esta unidade"
                                  : "Selecione um produto"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(() => {
                        const productsToShow = isEditing ? products : filteredProducts;
                        const safeProducts = Array.isArray(productsToShow) ? productsToShow : [];
                        return safeProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name}
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="portionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Porção</FormLabel>
                  <Select 
                    value={field.value ? field.value.toString() : ""} 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    disabled={!selectedProductId || availablePortions.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !selectedProductId 
                            ? "Selecione um produto primeiro" 
                            : availablePortions.length === 0 
                              ? "Nenhuma porção disponível"
                              : "Selecione uma porção"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availablePortions.map((portion) => (
                        <SelectItem key={portion.id} value={portion.id.toString()}>
                          {getPortionDisplay(portion)}
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
              name="storageMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Armazenamento</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a forma de armazenamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="congelado">
                        {getStorageOptionDisplay('congelado', selectedProductShelfLife)}
                      </SelectItem>
                      <SelectItem value="resfriado">
                        {getStorageOptionDisplay('resfriado', selectedProductShelfLife)}
                      </SelectItem>
                      <SelectItem value="temperatura_ambiente">
                        {getStorageOptionDisplay('temperatura_ambiente', selectedProductShelfLife)}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Responsável
              </FormLabel>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800">
                <span className="text-sm font-medium">
                  {user ? `${user.firstName} ${user.lastName}` : "Carregando..."}
                </span>
                <span className="text-xs text-muted-foreground">
                  (Usuário atual)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data de Produção
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        readOnly
                        className="bg-gray-50 dark:bg-gray-800"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data de Vencimento
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        readOnly={!isEditing}
                        className={!isEditing ? "bg-gray-50 dark:bg-gray-800" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isEditing ? "Atualizando..." : "Gerando..."}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditing ? "Atualizar" : "Gerar"} Etiqueta
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}