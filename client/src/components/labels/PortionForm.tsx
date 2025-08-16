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
  unitOfMeasure: z.string().min(1, "Selecione uma unidade"),
});

type PortionFormData = z.infer<typeof portionSchema>;

const units = [
  { value: "g", label: "Gramas (g)" },
  { value: "kg", label: "Quilos (kg)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "l", label: "Litros (l)" },
  { value: "un", label: "Unidades (un)" },
  { value: "fatias", label: "Fatias" },
  { value: "porções", label: "Porções" },
];

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
      unitOfMeasure: "",
    },
  });

  useEffect(() => {
    if (portion) {
      form.reset({
        productId: portion.productId,
        quantity: portion.quantity,
        unitOfMeasure: portion.unitOfMeasure,
      });
    } else {
      form.reset({
        productId: 0,
        quantity: 1,
        unitOfMeasure: "",
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
    mutation.mutate(data);
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
            Configure a quantidade e unidade de medida para o produto
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

              <FormField
                control={form.control}
                name="unitOfMeasure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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