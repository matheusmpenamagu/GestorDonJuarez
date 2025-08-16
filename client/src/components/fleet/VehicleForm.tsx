import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { insertVehicleSchema, type Vehicle } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

const formSchema = insertVehicleSchema.extend({
  nextMaintenanceDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface VehicleFormProps {
  vehicle?: Vehicle | null;
  onSuccess?: () => void;
}

export default function VehicleForm({ vehicle, onSuccess }: VehicleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: vehicle?.name || "",
      licensePlate: vehicle?.licensePlate || "",
      nextMaintenanceKm: vehicle?.nextMaintenanceKm || undefined,
      nextMaintenanceDate: vehicle?.nextMaintenanceDate 
        ? format(new Date(vehicle.nextMaintenanceDate), "yyyy-MM-dd")
        : "",
      isActive: vehicle?.isActive ?? true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const endpoint = vehicle ? `/api/fleet/vehicles/${vehicle.id}` : '/api/fleet/vehicles';
      const method = vehicle ? 'PUT' : 'POST';
      
      const payload = {
        ...data,
        nextMaintenanceDate: data.nextMaintenanceDate 
          ? new Date(data.nextMaintenanceDate).toISOString()
          : null,
      };
      
      return await apiRequest(method, endpoint, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/vehicles"] });
      toast({
        title: "Sucesso",
        description: vehicle ? "Veículo atualizado com sucesso!" : "Veículo cadastrado com sucesso!",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar veículo",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Veículo</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Kombi Branca" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="licensePlate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Placa</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: ABC-1234"
                    {...field}
                    style={{ fontFamily: 'monospace' }}
                    onChange={(e) => {
                      // Auto-format license plate
                      let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      if (value.length > 3) {
                        value = value.slice(0, 3) + '-' + value.slice(3, 7);
                      }
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nextMaintenanceKm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Próxima Revisão (KM)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nextMaintenanceDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Próxima Revisão (Data)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Veículo Ativo
                </FormLabel>
                <div className="text-sm text-muted-foreground">
                  Veículos inativos não aparecerão nas opções de abastecimento
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Salvando..." : (vehicle ? "Atualizar" : "Cadastrar")}
          </Button>
        </div>
      </form>
    </Form>
  );
}