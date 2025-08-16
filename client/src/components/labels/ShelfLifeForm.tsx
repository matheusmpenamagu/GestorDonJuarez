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
import { Loader2, Save, Snowflake, Refrigerator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Product {
  id: number;
  name: string;
  category: string;
}

interface ProductShelfLife {
  id: number;
  productId: number;
  frozenDays: number;
  chilledDays: number;
}

interface ShelfLifeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shelfLife?: ProductShelfLife | null;
  products: Product[];
}

const shelfLifeSchema = z.object({
  productId: z.number({ required_error: "Selecione um produto" }),
  frozenDays: z.number().min(1, "Deve ser maior que 0"),
  chilledDays: z.number().min(1, "Deve ser maior que 0"),
});

type ShelfLifeFormData = z.infer<typeof shelfLifeSchema>;

export default function ShelfLifeForm({
  open,
  onOpenChange,
  shelfLife,
  products,
}: ShelfLifeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!shelfLife;

  const form = useForm<ShelfLifeFormData>({
    resolver: zodResolver(shelfLifeSchema),
    defaultValues: {
      productId: 0,
      frozenDays: 1,
      chilledDays: 1,
    },
  });

  useEffect(() => {
    if (shelfLife) {
      form.reset({
        productId: shelfLife.productId,
        frozenDays: shelfLife.frozenDays,
        chilledDays: shelfLife.chilledDays,
      });
    } else {
      form.reset({
        productId: 0,
        frozenDays: 1,
        chilledDays: 1,
      });
    }
  }, [shelfLife, form]);

  const mutation = useMutation({
    mutationFn: async (data: ShelfLifeFormData) => {
      const url = isEditing
        ? `/api/labels/shelf-lifes/${shelfLife.id}`
        : "/api/labels/shelf-lifes";
      const method = isEditing ? "PUT" : "POST";

      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels/shelf-lifes"] });
      toast({
        title: isEditing ? "Validade atualizada" : "Validade criada",
        description: isEditing 
          ? "Validade atualizada com sucesso" 
          : "Validade criada com sucesso",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving shelf life:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar validade",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ShelfLifeFormData) => {
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
            {isEditing ? "Editar Validade" : "Adicionar Validade"}
          </DialogTitle>
          <DialogDescription>
            Configure os prazos de validade para produtos congelados e refrigerados
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
                name="frozenDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Snowflake className="w-4 h-4" />
                      Congelado (dias)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="chilledDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Refrigerator className="w-4 h-4" />
                      Refrigerado (dias)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditing ? "Atualizar" : "Criar"} Validade
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