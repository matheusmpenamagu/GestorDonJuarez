import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, Building2, Clock, FileText } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function ChecklistConfiguracoes() {
  const configSections = [
    {
      title: "Colaboradores",
      description: "Gerencie colaboradores que podem executar checklists",
      icon: Users,
      href: "/colaboradores",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      items: [
        "Cadastro de colaboradores",
        "Definição de cargos e permissões",
        "Controle de acesso aos checklists"
      ]
    },
    {
      title: "Unidades",
      description: "Configure as unidades onde os checklists serão executados",
      icon: Building2,
      href: "/unidades",
      color: "text-green-600",
      bgColor: "bg-green-50",
      items: [
        "Cadastro de unidades/locais",
        "Organização por região",
        "Atribuição de checklists específicos"
      ]
    },
    {
      title: "Templates",
      description: "Crie e edite modelos de checklist",
      icon: FileText,
      href: "/checklists/templates",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      items: [
        "Criação de templates",
        "Definição de itens de verificação",
        "Configuração de frequências"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações de Checklists</h1>
        <p className="text-gray-500">Configure os componentes do sistema de checklists</p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {configSections.map((section, index) => {
          const IconComponent = section.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${section.bgColor}`}>
                    <IconComponent className={`h-6 w-6 ${section.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3"></div>
                      {item}
                    </div>
                  ))}
                </div>
                
                <Link href={section.href}>
                  <Button className="w-full" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-orange-600" />
              Frequências de Checklist
            </CardTitle>
            <CardDescription>
              Entenda os tipos de frequência disponíveis para os checklists
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Badge className="bg-blue-100 text-blue-800">Diário</Badge>
                <p className="text-sm text-gray-600">
                  Checklists que devem ser executados todos os dias
                </p>
              </div>
              <div className="space-y-2">
                <Badge className="bg-green-100 text-green-800">Semanal</Badge>
                <p className="text-sm text-gray-600">
                  Checklists executados uma vez por semana
                </p>
              </div>
              <div className="space-y-2">
                <Badge className="bg-yellow-100 text-yellow-800">Mensal</Badge>
                <p className="text-sm text-gray-600">
                  Checklists executados uma vez por mês
                </p>
              </div>
              <div className="space-y-2">
                <Badge className="bg-purple-100 text-purple-800">Sob demanda</Badge>
                <p className="text-sm text-gray-600">
                  Checklists executados quando necessário
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Categorias de Checklist</CardTitle>
            <CardDescription>
              Categorias disponíveis para organizar seus checklists
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="text-center space-y-2">
                <Badge className="bg-blue-100 text-blue-800">Limpeza</Badge>
                <p className="text-xs text-gray-600">
                  Rotinas de higienização e limpeza
                </p>
              </div>
              <div className="text-center space-y-2">
                <Badge className="bg-red-100 text-red-800">Segurança</Badge>
                <p className="text-xs text-gray-600">
                  Verificações de segurança
                </p>
              </div>
              <div className="text-center space-y-2">
                <Badge className="bg-yellow-100 text-yellow-800">Manutenção</Badge>
                <p className="text-xs text-gray-600">
                  Manutenção preventiva
                </p>
              </div>
              <div className="text-center space-y-2">
                <Badge className="bg-green-100 text-green-800">Qualidade</Badge>
                <p className="text-xs text-gray-600">
                  Controle de qualidade
                </p>
              </div>
              <div className="text-center space-y-2">
                <Badge className="bg-purple-100 text-purple-800">Operacional</Badge>
                <p className="text-xs text-gray-600">
                  Processos operacionais
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}