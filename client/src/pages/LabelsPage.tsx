import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Tags, Archive } from "lucide-react";
import ShelfLifesTab from "@/components/labels/ShelfLifesTab";
import PortionsTab from "@/components/labels/PortionsTab";
import LabelsTab from "@/components/labels/LabelsTab";
import LabelStatusCards from "@/components/LabelStatusCards";

export default function LabelsPage() {

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Etiquetas
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestão de validades, porcionamentos e geração de etiquetas
          </p>
        </div>
        

      </div>

      {/* Status Cards */}
      <LabelStatusCards />

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="etiquetas" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="etiquetas" className="flex items-center gap-2">
                <Tags className="w-4 h-4" />
                Etiquetas
              </TabsTrigger>
              <TabsTrigger value="validades" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Validades
              </TabsTrigger>
              <TabsTrigger value="porcionamentos" className="flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Porcionamentos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="etiquetas" className="mt-6">
              <LabelsTab />
            </TabsContent>

            <TabsContent value="validades" className="mt-6">
              <ShelfLifesTab />
            </TabsContent>

            <TabsContent value="porcionamentos" className="mt-6">
              <PortionsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>


    </div>
  );
}