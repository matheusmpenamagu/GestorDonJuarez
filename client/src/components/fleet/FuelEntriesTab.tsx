import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import FuelEntryForm from "./FuelEntryForm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FuelEntry } from "@shared/schema";

export default function FuelEntriesTab() {
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<FuelEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: fuelEntries = [], isLoading } = useQuery({
    queryKey: ["/api/fleet/fuel-entries"],
  });

  // Calcular km rodados para cada abastecimento
  const fuelEntriesWithKmRodados = fuelEntries.map((entry, index) => {
    let kmRodados = 0;
    if (index < fuelEntries.length - 1) {
      const previousEntry = fuelEntries[index + 1]; // Array está ordenado por data desc
      kmRodados = entry.currentKm - previousEntry.currentKm;
    }
    return { ...entry, kmRodados };
  });

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

  // Filter fuel entries based on search
  const filteredEntries = fuelEntriesWithKmRodados.filter((entry: any) => {
    const vehicle = vehicles.find((v: any) => v.id === entry.vehicleId);
    const searchTerm = search.toLowerCase();
    
    return (
      vehicle?.name.toLowerCase().includes(searchTerm) ||
      vehicle?.licensePlate.toLowerCase().includes(searchTerm) ||
      entry.currentKm.toString().includes(searchTerm)
    );
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatLiters = (value: number) => {
    return `${value.toFixed(3)}L`;
  };

  const getVehicleName = (vehicleId: number) => {
    const vehicle = vehicles.find((v: any) => v.id === vehicleId);
    return vehicle ? `${vehicle.name} (${vehicle.licensePlate})` : 'Veículo não encontrado';
  };

  const getFuelName = (fuelId: number) => {
    const fuel = fuels.find((f: any) => f.id === fuelId);
    return fuel?.name || 'Combustível não encontrado';
  };

  const getGasStationName = (gasStationId: number) => {
    const gasStation = gasStations.find((gs: any) => gs.id === gasStationId);
    return gasStation?.name || 'Posto não encontrado';
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find((e: any) => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Funcionário não encontrado';
  };

  const handleEdit = (entry: FuelEntry) => {
    setSelectedEntry(entry);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedEntry(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedEntry(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por veículo, placa ou KM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Abastecimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedEntry ? "Editar Abastecimento" : "Novo Abastecimento"}
              </DialogTitle>
            </DialogHeader>
            <FuelEntryForm
              fuelEntry={selectedEntry}
              onSuccess={handleDialogClose}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhum abastecimento encontrado.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map((entry: any) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">
                      {format(new Date(entry.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(entry)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Veículo</p>
                    <p className="font-medium">{getVehicleName(entry.vehicleId)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Responsável</p>
                    <p className="font-medium">{getEmployeeName(entry.employeeId)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">KM Atual</p>
                    <p className="font-medium">{entry.currentKm.toLocaleString('pt-BR')} km</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Combustível</p>
                    <Badge variant="secondary">{getFuelName(entry.fuelId)}</Badge>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Posto</p>
                    <p className="font-medium">{getGasStationName(entry.gasStationId)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Quantidade</p>
                    <p className="font-medium">{formatLiters(parseFloat(entry.liters))}</p>
                  </div>

                  <div className="md:col-span-3">
                    <div className="flex items-center justify-between pt-4 mt-4 border-t bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <span className="text-2xl font-bold text-primary">
                            {formatCurrency(parseFloat(entry.value))}
                          </span>
                          <p className="text-xs text-muted-foreground">Total Pago</p>
                        </div>
                        <div className="text-center">
                          <span className="text-lg font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                            {formatCurrency(parseFloat(entry.value) / parseFloat(entry.liters))}/L
                          </span>
                          <p className="text-xs text-muted-foreground">Preço por Litro</p>
                        </div>
                      </div>
                      {entry.kmRodados > 0 && (
                        <div className="text-center">
                          <span className="text-lg font-medium text-blue-600">
                            {entry.kmRodados.toLocaleString('pt-BR')} km
                          </span>
                          <p className="text-xs text-muted-foreground">Km Rodados</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}