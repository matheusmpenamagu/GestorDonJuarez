import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, Calendar, Car, Clock, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import FuelEntryForm from "./FuelEntryForm";
import { format, differenceInDays } from "date-fns";
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

  // Calcular informações de revisão para cada veículo
  const getMaintenanceInfo = (vehicle: any) => {
    // Encontrar último abastecimento do veículo
    const vehicleFuelEntries = fuelEntries.filter((entry: any) => entry.vehicleId === vehicle.id);
    const lastEntry = vehicleFuelEntries.length > 0 ? vehicleFuelEntries[0] : null;
    
    const info: any = {
      kmRemaining: null,
      daysRemaining: null,
      status: 'unknown'
    };

    if (vehicle.nextMaintenanceKm && lastEntry) {
      info.kmRemaining = vehicle.nextMaintenanceKm - lastEntry.currentKm;
      if (info.kmRemaining <= 0) {
        info.status = 'overdue';
      } else if (info.kmRemaining <= 1000) {
        info.status = 'danger';
      } else {
        info.status = 'ok';
      }
    }

    if (vehicle.nextMaintenanceDate) {
      const maintenanceDate = new Date(vehicle.nextMaintenanceDate);
      const today = new Date();
      info.daysRemaining = differenceInDays(maintenanceDate, today);
      
      if (info.daysRemaining <= 0) {
        info.status = 'overdue';
      } else if (info.daysRemaining <= 30) {
        info.status = 'danger';
      } else if (info.status !== 'danger' && info.status !== 'overdue') {
        info.status = 'ok';
      }
    }

    return info;
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
      {/* Cards de veículos com informações de revisão */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((vehicle: any) => {
          const maintenanceInfo = getMaintenanceInfo(vehicle);
          const getBorderColor = () => {
            switch (maintenanceInfo.status) {
              case 'overdue': return 'border-l-red-600';
              case 'danger': return 'border-l-red-500';
              case 'ok': return 'border-l-green-500';
              default: return 'border-l-gray-400';
            }
          };
          return (
            <Card key={vehicle.id} className={`border-l-4 ${getBorderColor()}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Car className="h-5 w-5 text-blue-600" />
                  {vehicle.name}
                  <Badge variant="outline" className="text-xs">
                    {vehicle.licensePlate}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {maintenanceInfo.kmRemaining !== null && (
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Próxima revisão: 
                        <span className={`ml-1 font-medium ${
                          maintenanceInfo.status === 'overdue' ? 'text-red-700' :
                          maintenanceInfo.status === 'danger' ? 'text-red-600' :
                          'text-green-600'
                        }`}>
                          {maintenanceInfo.kmRemaining > 0 
                            ? `${maintenanceInfo.kmRemaining.toLocaleString('pt-BR')} km`
                            : `${Math.abs(maintenanceInfo.kmRemaining).toLocaleString('pt-BR')} km atrasado`
                          }
                        </span>
                      </span>
                    </div>
                  )}
                  {maintenanceInfo.daysRemaining !== null && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className={`font-medium ${
                          maintenanceInfo.status === 'overdue' ? 'text-red-700' :
                          maintenanceInfo.status === 'danger' ? 'text-red-600' :
                          'text-green-600'
                        }`}>
                          {maintenanceInfo.daysRemaining > 0 
                            ? `${maintenanceInfo.daysRemaining} dias restantes`
                            : maintenanceInfo.daysRemaining === 0 
                              ? 'Revisão hoje!'
                              : `${Math.abs(maintenanceInfo.daysRemaining)} dias atrasado`
                          }
                        </span>
                      </span>
                    </div>
                  )}
                  {maintenanceInfo.kmRemaining === null && maintenanceInfo.daysRemaining === null && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Próxima revisão não definida</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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