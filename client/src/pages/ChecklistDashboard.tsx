import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, FileText, Clock, AlertCircle, Plus, Calendar, Users, BarChart3, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface ChecklistStats {
  totalTemplates: number;
  activeInstances: number;
  completedToday: number;
  pendingTasks: number;
}

interface RecentActivity {
  id: number;
  template: string;
  employee: string;
  status: string;
  completedAt: string;
}

export default function ChecklistDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<ChecklistStats>({
    queryKey: ["/api/checklist-dashboard-stats"],
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/checklist-recent-activity"],
  });

  if (statsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ChecklistZap</h1>
            <p className="text-gray-600">Dashboard de controle e monitoramento</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ChecklistZap</h1>
          <p className="text-lg text-gray-600">Dashboard de controle e monitoramento</p>
        </div>
        <div className="flex gap-3">
          <Link href="/checklists/templates">
            <Button variant="outline" size="lg" className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Templates
            </Button>
          </Link>
          <Link href="/checklists/templates">
            <Button size="lg" className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700">
              <Plus className="h-5 w-5" />
              Novo Checklist
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Templates Ativos</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.totalTemplates || 0}</div>
            <p className="text-sm text-gray-500 mt-1">Modelos criados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Em Andamento</CardTitle>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.activeInstances || 0}</div>
            <p className="text-sm text-gray-500 mt-1">Checklists executando</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Concluídos Hoje</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckSquare className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.completedToday || 0}</div>
            <p className="text-sm text-gray-500 mt-1">Finalizados hoje</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pendentes</CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.pendingTasks || 0}</div>
            <p className="text-sm text-gray-500 mt-1">Aguardando execução</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 hover:shadow-lg transition-shadow">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Activity className="h-6 w-6 text-orange-600" />
              Atividade Recente
            </CardTitle>
            <CardDescription className="text-base">Últimas execuções de checklists no sistema</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {activityLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-40"></div>
                      <div className="h-3 bg-gray-200 rounded w-28"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-24"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity && recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-lg border">
                          <CheckSquare className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{activity.template}</p>
                          <p className="text-sm text-gray-500">executado por {activity.employee}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                          activity.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : activity.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {activity.status === 'completed' ? 'Concluído' : 
                           activity.status === 'pending' ? 'Pendente' : activity.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{activity.completedAt}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg text-gray-500 mb-2">Nenhuma atividade recente</p>
                    <p className="text-sm text-gray-400">Crie seu primeiro checklist para começar a monitorar</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="h-6 w-6 text-orange-600" />
              Ações Rápidas
            </CardTitle>
            <CardDescription className="text-base">Acesso direto às principais funcionalidades</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <Link href="/checklists/templates">
              <Button variant="outline" size="lg" className="w-full justify-start hover:bg-blue-50 border-blue-200">
                <FileText className="h-5 w-5 mr-3 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium">Criar Template</p>
                  <p className="text-xs text-gray-500">Novo modelo de checklist</p>
                </div>
              </Button>
            </Link>
            
            <Link href="/checklists">
              <Button variant="outline" size="lg" className="w-full justify-start hover:bg-green-50 border-green-200">
                <CheckSquare className="h-5 w-5 mr-3 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">Executar Checklist</p>
                  <p className="text-xs text-gray-500">Iniciar nova execução</p>
                </div>
              </Button>
            </Link>
            
            <Link href="/pessoas">
              <Button variant="outline" size="lg" className="w-full justify-start hover:bg-purple-50 border-purple-200">
                <Users className="h-5 w-5 mr-3 text-purple-600" />
                <div className="text-left">
                  <p className="font-medium">Gerenciar Equipe</p>
                  <p className="text-xs text-gray-500">Funcionários e permissões</p>
                </div>
              </Button>
            </Link>
            
            <Link href="/checklists/configuracoes">
              <Button variant="outline" size="lg" className="w-full justify-start hover:bg-orange-50 border-orange-200">
                <Calendar className="h-5 w-5 mr-3 text-orange-600" />
                <div className="text-left">
                  <p className="font-medium">Configurações</p>
                  <p className="text-xs text-gray-500">Ajustes do sistema</p>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Performance Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              Performance Semanal
            </CardTitle>
            <CardDescription>Estatísticas dos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-2xl font-bold text-gray-900 mb-2">85%</div>
              <p className="text-gray-500">Taxa de conclusão média</p>
              <div className="mt-4 h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-orange-600 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              Equipe Ativa
            </CardTitle>
            <CardDescription>Funcionários que executaram checklists hoje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-2xl font-bold text-gray-900 mb-2">12</div>
              <p className="text-gray-500">de 26 funcionários</p>
              <div className="mt-4 h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-green-600 rounded-full" style={{ width: '46%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}