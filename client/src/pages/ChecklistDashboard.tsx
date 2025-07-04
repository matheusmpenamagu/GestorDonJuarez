import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, FileText, Clock, AlertCircle, Plus, Calendar, Users, BarChart3, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface ChecklistStats {
  activeChecklists: number;
  checklistsWithPendingTasks: number;
  pendingTasksLast30Days: number;
  completedTasksLast30Days: number;
}

interface RecentChecklist {
  id: number;
  name: string;
  status: string;
  startedAt: string;
  collaboratorName?: string;
  taskCount: number;
}

interface UpcomingChecklist {
  id: number;
  name: string;
  nextExecution: string;
  periodicity: string;
  collaboratorName?: string;
}

interface CollaboratorRanking {
  collaboratorId: number;
  collaboratorName: string;
  collaboratorPosition: string;
  pendingTasks: number;
}

export default function ChecklistDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<ChecklistStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentChecklists, isLoading: recentLoading } = useQuery<RecentChecklist[]>({
    queryKey: ["/api/dashboard/recent-checklists"],
  });

  const { data: upcomingChecklists, isLoading: upcomingLoading } = useQuery<UpcomingChecklist[]>({
    queryKey: ["/api/dashboard/upcoming-checklists"],
  });

  const { data: collaboratorsRanking, isLoading: rankingLoading } = useQuery<CollaboratorRanking[]>({
    queryKey: ["/api/dashboard/collaborators-ranking"],
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
        <Link href="/checklists/templates">
          <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-5 w-5 mr-2" />
            Novo Checklist
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Checklists Ativos</CardTitle>
            <CheckSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.activeChecklists || 0}</div>
            <p className="text-xs text-gray-500">Templates em uso</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Com Pendências</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.checklistsWithPendingTasks || 0}</div>
            <p className="text-xs text-gray-500">Checklists com tarefas pendentes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tarefas Pendentes (30d)</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.pendingTasksLast30Days || 0}</div>
            <p className="text-xs text-gray-500">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tarefas Concluídas (30d)</CardTitle>
            <CheckSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.completedTasksLast30Days || 0}</div>
            <p className="text-xs text-gray-500">Últimos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Checklists recentes e Próximos checklists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Checklists recentes
            </CardTitle>
            <CardDescription>
              Últimas execuções realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4 mt-1"></div>
                    </div>
                    <div className="w-20 h-6 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : recentChecklists && recentChecklists.length > 0 ? (
              <div className="space-y-4">
                {recentChecklists.slice(0, 5).map((checklist) => (
                  <div key={checklist.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <CheckSquare className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{checklist.name}</p>
                        <p className="text-xs text-gray-500">
                          {checklist.collaboratorName ? `por ${checklist.collaboratorName}` : 'Sem responsável'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        checklist.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : checklist.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-800'
                          : checklist.status === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {checklist.status === 'completed' ? '✅ Concluído' : 
                         checklist.status === 'in_progress' ? '⏳ Em andamento' : 
                         checklist.status === 'overdue' ? '🔴 Atrasado' :
                         '⏸️ Pendente'}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(checklist.startedAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t">
                  <Link href="/checklists">
                    <Button variant="ghost" size="sm" className="w-full">
                      Ver todos os checklists
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum checklist executado recentemente</p>
                <p className="text-sm text-gray-400 mt-1">
                  Execuções aparecerão aqui
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximos checklists
            </CardTitle>
            <CardDescription>
              Agendados para execução
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4 mt-1"></div>
                    </div>
                    <div className="w-20 h-6 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : upcomingChecklists && upcomingChecklists.length > 0 ? (
              <div className="space-y-4">
                {upcomingChecklists.slice(0, 5).map((checklist) => (
                  <div key={checklist.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{checklist.name}</p>
                        <p className="text-xs text-gray-500">
                          {checklist.collaboratorName ? checklist.collaboratorName : 'Sem responsável'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {checklist.periodicity}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(checklist.nextExecution).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t">
                  <Link href="/checklists">
                    <Button variant="ghost" size="sm" className="w-full">
                      Ver agenda completa
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum checklist agendado</p>
                <p className="text-sm text-gray-400 mt-1">
                  Checklists agendados aparecerão aqui
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Colaboradores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ranking de tarefas pendentes
          </CardTitle>
          <CardDescription>
            Colaboradores com mais tarefas pendentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rankingLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3 animate-pulse">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/6 mt-1"></div>
                  </div>
                  <div className="w-8 h-6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : collaboratorsRanking && collaboratorsRanking.length > 0 ? (
            <div className="space-y-3">
              {collaboratorsRanking.map((collaborator, index) => (
                <div key={collaborator.collaboratorId} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-semibold text-sm">
                      #{index + 1}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-medium">
                        {collaborator.collaboratorName
                          ? `${collaborator.collaboratorName.split(' ')[0][0]}${
                              collaborator.collaboratorName.split(' ')[1]?.[0] || ''
                            }`
                          : 'C'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {collaborator.collaboratorName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {collaborator.collaboratorPosition}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {collaborator.pendingTasks} {collaborator.pendingTasks === 1 ? 'tarefa' : 'tarefas'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                Nenhum colaborador com tarefas pendentes no momento
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/checklists/templates">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center p-6">
              <FileText className="h-8 w-8 text-blue-500 mr-4" />
              <div>
                <h3 className="font-semibold text-gray-900">Gerenciar Templates</h3>
                <p className="text-sm text-gray-600">Criar e editar checklists</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/colaboradores">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center p-6">
              <Users className="h-8 w-8 text-green-500 mr-4" />
              <div>
                <h3 className="font-semibold text-gray-900">Colaboradores</h3>
                <p className="text-sm text-gray-600">Gerenciar equipe</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/checklists/configuracoes">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center p-6">
              <BarChart3 className="h-8 w-8 text-purple-500 mr-4" />
              <div>
                <h3 className="font-semibold text-gray-900">Relatórios</h3>
                <p className="text-sm text-gray-600">Análises e histórico</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}