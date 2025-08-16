import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Tags, Archive } from "lucide-react";
import ShelfLifesTab from "@/components/labels/ShelfLifesTab";
import PortionsTab from "@/components/labels/PortionsTab";
import LabelsTab from "@/components/labels/LabelsTab";

export default function LabelsPage() {

  const stats = [
    {
      title: "Validades Cadastradas",
      value: "12",
      description: "Produtos com prazo definido",
      icon: Calendar,
      variant: "default" as const,
    },
    {
      title: "Porcionamentos",
      value: "8",
      description: "Configurações ativas",
      icon: Archive,
      variant: "default" as const,
    },
    {
      title: "Etiquetas Hoje",
      value: "24",
      description: "Geradas hoje",
      icon: Tags,
      variant: "default" as const,
    },
  ];

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="validades" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="validades" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Validades
              </TabsTrigger>
              <TabsTrigger value="porcionamentos" className="flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Porcionamentos
              </TabsTrigger>
              <TabsTrigger value="etiquetas" className="flex items-center gap-2">
                <Tags className="w-4 h-4" />
                Etiquetas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="validades" className="mt-6">
              <ShelfLifesTab />
            </TabsContent>

            <TabsContent value="porcionamentos" className="mt-6">
              <PortionsTab />
            </TabsContent>

            <TabsContent value="etiquetas" className="mt-6">
              <LabelsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>


    </div>
  );
}