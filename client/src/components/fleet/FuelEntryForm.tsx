import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertFuelEntrySchema, type FuelEntry } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

const formSchema = insertFuelEntrySchema.extend({
  date: z.string().min(1, "Data é obrigatória"),
  value: z.number().min(0.01, "Valor deve ser maior que zero"),
  liters: z.number().min(0.001, "Litros deve ser maior que zero"),
  currentKm: z.number().min(0, "KM deve ser maior ou igual a zero"),
});

type FormValues = z.infer<typeof formSchema>;

interface FuelEntryFormProps {
  fuelEntry?: FuelEntry | null;
  onSuccess?: () => void;
}

export default function FuelEntryForm({ fuelEntry, onSuccess }: FuelEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/fleet/vehicles"],
  });

  const { data: fuels = [] } = useQuery({
    queryKey: ["/api/fleet/fuels"],
  });

  const { data: gasStations = [] } = useQuery({
    queryKey: ["/api/fleet/gas-stations"],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: fuelEntry ? format(new Date(fuelEntry.date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      employeeId: fuelEntry?.employeeId || 0,
      vehicleId: fuelEntry?.vehicleId || 0,
      currentKm: fuelEntry?.currentKm || undefined,
      value: fuelEntry ? parseFloat(fuelEntry.value as string) : undefined,
      liters: fuelEntry ? parseFloat(fuelEntry.liters as string) : undefined,
      fuelId: fuelEntry?.fuelId || 0,
      gasStationId: fuelEntry?.gasStationId || 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const endpoint = fuelEntry ? `/api/fleet/fuel-entries/${fuelEntry.id}` : '/api/fleet/fuel-entries';
      const method = fuelEntry ? 'PUT' : 'POST';
      
      const payload = {
        ...data,
        date: new Date(data.date).toISOString(),
      };
      
      return await apiRequest(method, endpoint, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/fuel-entries"] });
      toast({
        title: "Sucesso",
        description: fuelEntry ? "Abastecimento atualizado com sucesso!" : "Abastecimento registrado com sucesso!",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar abastecimento",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  const calculatePricePerLiter = () => {
    const value = form.watch("value");
    const liters = form.watch("liters");
    
    if (value && liters && liters > 0) {
      return (value / liters).toFixed(3);
    }
    return "0.000";
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data e Hora</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsável</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar funcionário" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employees.map((employee: any) => (
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
            name="vehicleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Veículo</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar veículo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vehicles.filter((v: any) => v.isActive).map((vehicle: any) => (
                      <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                        {vehicle.name} ({vehicle.licensePlate})
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
            name="currentKm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>KM Atual</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fuelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Combustível</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar combustível" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fuels.filter((f: any) => f.isActive).map((fuel: any) => (
                      <SelectItem key={fuel.id} value={fuel.id.toString()}>
                        {fuel.name}
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
            name="gasStationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Posto</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar posto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {gasStations.filter((gs: any) => gs.isActive).map((gasStation: any) => (
                      <SelectItem key={gasStation.id} value={gasStation.id.toString()}>
                        {gasStation.name}
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
            name="liters"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Litros</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.001"
                    placeholder="0.000"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (R$)</FormLabel>
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
        </div>

        <div className="bg-muted p-3 rounded-md">
          <p className="text-sm text-muted-foreground">
            Preço por litro: <span className="font-medium">R$ {calculatePricePerLiter()}</span>
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Salvando..." : (fuelEntry ? "Atualizar" : "Registrar")}
          </Button>
        </div>
      </form>
    </Form>
  );
}