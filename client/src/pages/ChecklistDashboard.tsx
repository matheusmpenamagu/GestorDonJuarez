import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, FileText, Clock, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ChecklistStats {
  totalTemplates: number;
  activeInstances: number;
  completedToday: number;
  pendingTasks: number;
}

export default function ChecklistDashboard() {
  const { data: stats, isLoading } = useQuery<ChecklistStats>({
    queryKey: ["/api/checklist-dashboard-stats"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Checklists</h1>
          <p className="text-gray-500">Visão geral das atividades de checklist</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <Skeleton className="h-4 w-20" />
                </CardTitle>
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-24 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Templates Ativos",
      value: stats?.totalTemplates || 0,
      description: "Modelos de checklist disponíveis",
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "Em Andamento",
      value: stats?.activeInstances || 0,
      description: "Checklists sendo executados",
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      title: "Concluídos Hoje",
      value: stats?.completedToday || 0,
      description: "Finalizados nas últimas 24h",
      icon: CheckSquare,
      color: "text-green-600",
    },
    {
      title: "Pendentes",
      value: stats?.pendingTasks || 0,
      description: "Aguardando execução",
      icon: AlertCircle,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Checklists</h1>
        <p className="text-gray-500">Visão geral das atividades de checklist</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <IconComponent className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-gray-500">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>
              Últimos checklists executados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-8">
              Em breve - Lista de atividades recentes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estatísticas por Unidade</CardTitle>
            <CardDescription>
              Performance das unidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-8">
              Em breve - Estatísticas por unidade
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}