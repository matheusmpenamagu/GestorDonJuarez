import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Car, Calendar, Activity, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import VehicleForm from "./VehicleForm";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Vehicle } from "@shared/schema";

export default function VehiclesTab() {
  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["/api/fleet/vehicles"],
  });

  // Filter vehicles based on search
  const filteredVehicles = vehicles.filter((vehicle: Vehicle) => {
    const searchTerm = search.toLowerCase();
    return (
      vehicle.name.toLowerCase().includes(searchTerm) ||
      vehicle.licensePlate.toLowerCase().includes(searchTerm)
    );
  });

  const getMaintenanceStatus = (vehicle: Vehicle) => {
    const today = new Date();
    
    // Check date-based maintenance
    if (vehicle.nextMaintenanceDate) {
      const maintenanceDate = new Date(vehicle.nextMaintenanceDate);
      const daysUntilMaintenance = Math.ceil((maintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilMaintenance < 0) {
        return { status: 'overdue', text: 'Atrasada', color: 'destructive' };
      } else if (daysUntilMaintenance <= 30) {
        return { status: 'soon', text: `${daysUntilMaintenance} dias`, color: 'warning' };
      }
    }
    
    return { status: 'ok', text: 'Em dia', color: 'secondary' };
  };

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedVehicle(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedVehicle(null);
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
          <Input
            placeholder="Buscar por nome ou placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Veículo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedVehicle ? "Editar Veículo" : "Novo Veículo"}
              </DialogTitle>
            </DialogHeader>
            <VehicleForm
              vehicle={selectedVehicle}
              onSuccess={handleDialogClose}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredVehicles.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhum veículo encontrado.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredVehicles.map((vehicle: Vehicle) => {
            const maintenanceStatus = getMaintenanceStatus(vehicle);
            
            return (
              <Card key={vehicle.id} className={`hover:shadow-md transition-shadow ${!vehicle.isActive ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(vehicle)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Placa</p>
                    <p className="font-mono font-medium text-lg">{vehicle.licensePlate}</p>
                  </div>

                  {vehicle.nextMaintenanceKm && (
                    <div>
                      <p className="text-sm text-muted-foreground">Próxima revisão (KM)</p>
                      <p className="font-medium">{vehicle.nextMaintenanceKm.toLocaleString('pt-BR')} km</p>
                    </div>
                  )}

                  {vehicle.nextMaintenanceDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Próxima revisão (Data)</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">
                          {format(new Date(vehicle.nextMaintenanceDate), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={vehicle.isActive ? "default" : "secondary"}>
                        {vehicle.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>

                    {vehicle.nextMaintenanceDate && (
                      <div className="flex items-center gap-2">
                        {maintenanceStatus.status === 'overdue' && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <Badge 
                          variant={
                            maintenanceStatus.color === 'destructive' ? 'destructive' :
                            maintenanceStatus.color === 'warning' ? 'secondary' : 'outline'
                          }
                          className={maintenanceStatus.color === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : ''}
                        >
                          {maintenanceStatus.text}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}