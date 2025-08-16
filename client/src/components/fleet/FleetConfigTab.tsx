import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, MapPin, Fuel as FuelIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFuelSchema, insertGasStationSchema, type Fuel, type GasStation } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

type FuelFormValues = z.infer<typeof insertFuelSchema>;
type GasStationFormValues = z.infer<typeof insertGasStationSchema>;

export default function FleetConfigTab() {
  const [selectedFuel, setSelectedFuel] = useState<Fuel | null>(null);
  const [selectedGasStation, setSelectedGasStation] = useState<GasStation | null>(null);
  const [isFuelDialogOpen, setIsFuelDialogOpen] = useState(false);
  const [isGasStationDialogOpen, setIsGasStationDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fuels = [] } = useQuery({
    queryKey: ["/api/fleet/fuels"],
  });

  const { data: gasStations = [] } = useQuery({
    queryKey: ["/api/fleet/gas-stations"],
  });

  const fuelForm = useForm<FuelFormValues>({
    resolver: zodResolver(insertFuelSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  const gasStationForm = useForm<GasStationFormValues>({
    resolver: zodResolver(insertGasStationSchema),
    defaultValues: {
      name: "",
      address: "",
      isActive: true,
    },
  });

  const fuelMutation = useMutation({
    mutationFn: async (data: FuelFormValues) => {
      const endpoint = selectedFuel ? `/api/fleet/fuels/${selectedFuel.id}` : '/api/fleet/fuels';
      const method = selectedFuel ? 'PUT' : 'POST';
      return await apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/fuels"] });
      toast({
        title: "Sucesso",
        description: selectedFuel ? "Combustível atualizado!" : "Combustível adicionado!",
      });
      setIsFuelDialogOpen(false);
      setSelectedFuel(null);
      fuelForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar combustível",
        variant: "destructive",
      });
    },
  });

  const gasStationMutation = useMutation({
    mutationFn: async (data: GasStationFormValues) => {
      const endpoint = selectedGasStation ? `/api/fleet/gas-stations/${selectedGasStation.id}` : '/api/fleet/gas-stations';
      const method = selectedGasStation ? 'PUT' : 'POST';
      return await apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/gas-stations"] });
      toast({
        title: "Sucesso",
        description: selectedGasStation ? "Posto atualizado!" : "Posto adicionado!",
      });
      setIsGasStationDialogOpen(false);
      setSelectedGasStation(null);
      gasStationForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar posto",
        variant: "destructive",
      });
    },
  });

  const handleEditFuel = (fuel: Fuel) => {
    setSelectedFuel(fuel);
    fuelForm.reset({
      name: fuel.name,
      description: fuel.description || "",
      isActive: fuel.isActive,
    });
    setIsFuelDialogOpen(true);
  };

  const handleEditGasStation = (gasStation: GasStation) => {
    setSelectedGasStation(gasStation);
    gasStationForm.reset({
      name: gasStation.name,
      address: gasStation.address || "",
      isActive: gasStation.isActive,
    });
    setIsGasStationDialogOpen(true);
  };

  const handleAddFuel = () => {
    setSelectedFuel(null);
    fuelForm.reset();
    setIsFuelDialogOpen(true);
  };

  const handleAddGasStation = () => {
    setSelectedGasStation(null);
    gasStationForm.reset();
    setIsGasStationDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Combustíveis Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FuelIcon className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Combustíveis</CardTitle>
            </div>
            <Dialog open={isFuelDialogOpen} onOpenChange={setIsFuelDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddFuel}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Combustível
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {selectedFuel ? "Editar Combustível" : "Novo Combustível"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...fuelForm}>
                  <form onSubmit={fuelForm.handleSubmit((data) => fuelMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={fuelForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Gasolina Comum" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={fuelForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição (opcional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descrição do combustível..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={fuelForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Ativo</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Combustíveis inativos não aparecerão nas opções
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
                      <Button type="submit" disabled={fuelMutation.isPending}>
                        {fuelMutation.isPending ? "Salvando..." : (selectedFuel ? "Atualizar" : "Adicionar")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {fuels.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum combustível cadastrado.
              </p>
            ) : (
              fuels.map((fuel: Fuel) => (
                <div key={fuel.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{fuel.name}</span>
                    {fuel.description && (
                      <span className="text-sm text-muted-foreground">- {fuel.description}</span>
                    )}
                    <Badge variant={fuel.isActive ? "default" : "secondary"}>
                      {fuel.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditFuel(fuel)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Postos Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Postos Autorizados</CardTitle>
            </div>
            <Dialog open={isGasStationDialogOpen} onOpenChange={setIsGasStationDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddGasStation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Posto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {selectedGasStation ? "Editar Posto" : "Novo Posto"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...gasStationForm}>
                  <form onSubmit={gasStationForm.handleSubmit((data) => gasStationMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={gasStationForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Posto Ipiranga Centro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={gasStationForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço (opcional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Endereço completo do posto..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={gasStationForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Ativo</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Postos inativos não aparecerão nas opções
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
                      <Button type="submit" disabled={gasStationMutation.isPending}>
                        {gasStationMutation.isPending ? "Salvando..." : (selectedGasStation ? "Atualizar" : "Adicionar")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {gasStations.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum posto cadastrado.
              </p>
            ) : (
              gasStations.map((gasStation: GasStation) => (
                <div key={gasStation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{gasStation.name}</span>
                      <Badge variant={gasStation.isActive ? "default" : "secondary"}>
                        {gasStation.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    {gasStation.address && (
                      <p className="text-sm text-muted-foreground mt-1">{gasStation.address}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditGasStation(gasStation)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}