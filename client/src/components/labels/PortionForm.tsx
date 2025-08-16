import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
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
import { Loader2, Save, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Product {
  id: number;
  name: string;
  category: string;
  unitOfMeasure: string;
}

interface ProductPortion {
  id: number;
  productId: number;
  quantity: number;
  unitOfMeasure: string;
}

interface PortionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portion?: ProductPortion | null;
  products: Product[];
}

const portionSchema = z.object({
  productId: z.number({ required_error: "Selecione um produto" }),
  quantity: z.number().min(1, "Deve ser maior que 0"),
});

type PortionFormData = z.infer<typeof portionSchema>;



export default function PortionForm({
  open,
  onOpenChange,
  portion,
  products,
}: PortionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!portion;

  const form = useForm<PortionFormData>({
    resolver: zodResolver(portionSchema),
    defaultValues: {
      productId: 0,
      quantity: 1,
    },
  });

  // Get selected product and its unit of measure
  const selectedProductId = form.watch("productId");
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const unitOfMeasure = selectedProduct?.unitOfMeasure || "";

  useEffect(() => {
    if (portion) {
      form.reset({
        productId: portion.productId,
        quantity: portion.quantity,
      });
    } else {
      form.reset({
        productId: 0,
        quantity: 1,
      });
    }
  }, [portion, form]);

  const mutation = useMutation({
    mutationFn: async (data: PortionFormData) => {
      const url = isEditing
        ? `/api/labels/portions/${portion.id}`
        : "/api/labels/portions";
      const method = isEditing ? "PUT" : "POST";

      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels/portions"] });
      toast({
        title: isEditing ? "Porcionamento atualizado" : "Porcionamento criado",
        description: isEditing 
          ? "Porcionamento atualizado com sucesso" 
          : "Porcionamento criado com sucesso",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving portion:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar porcionamento",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PortionFormData) => {
    // Add the unit of measure from the selected product
    const submitData = {
      ...data,
      unitOfMeasure: unitOfMeasure,
    };
    mutation.mutate(submitData);
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Porcionamento" : "Adicionar Porcionamento"}
          </DialogTitle>
          <DialogDescription>
            Configure a quantidade. A unidade de medida é definida pelo produto selecionado.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto</FormLabel>
                  <Select 
                    value={field.value.toString()} 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Scale className="w-4 h-4" />
                      Quantidade
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Unidade de Medida</FormLabel>
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800">
                  <Scale className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">
                    {unitOfMeasure || "Selecione um produto primeiro"}
                  </span>
                </div>
              </div>
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
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditing ? "Atualizar" : "Criar"} Porcionamento
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