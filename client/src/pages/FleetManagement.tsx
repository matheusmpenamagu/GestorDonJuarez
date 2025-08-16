import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Fuel, Settings, FileText } from "lucide-react";
import FuelEntriesTab from "@/components/fleet/FuelEntriesTab";
import VehiclesTab from "@/components/fleet/VehiclesTab";
import FleetConfigTab from "@/components/fleet/FleetConfigTab";

export default function FleetManagement() {
  const [activeTab, setActiveTab] = useState("fuel-entries");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Gestão de Frota
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Controle completo de veículos, abastecimentos e manutenções
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6 w-full max-w-md">
          <TabsTrigger value="fuel-entries" className="flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            Abastecimentos
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Veículos
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fuel-entries" className="space-y-6">
          <FuelEntriesTab />
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-6">
          <VehiclesTab />
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <FleetConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}