import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Users, Mail, User, Phone } from "lucide-react";
import { EmployeeWithRelations } from "@shared/schema";
import { Link } from "wouter";


// Função para exibir WhatsApp formatado na interface
const displayWhatsApp = (value: string | null): string => {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }
  return value;
};

export default function EmployeesManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/employees"],
  });


  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Sucesso",
        description: "Colaborador removido com sucesso!",
      });
    },
    onError: (error) => {
      console.error("Error deleting employee:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover colaborador",
        variant: "destructive",
      });
    },
  });


  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este colaborador?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Colaboradores</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie funcionários e suas permissões no sistema
          </p>
        </div>
        
        <Link href="/pessoas/colaboradores/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Colaborador
          </Button>
        </Link>
      </div>

      {employeesLoading ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Carregando colaboradores...
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Array.isArray(employees) ? employees : []).map((employee: EmployeeWithRelations) => (
            <Card key={employee.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                      {employee.avatar || "😊"}
                    </div>
                    {employee.firstName} {employee.lastName}
                  </div>
                  <div className="flex gap-1">
                    <Link href={`/pessoas/colaboradores/${employee.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(employee.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {employee.email}
                  </div>
                  {employee.whatsapp && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {displayWhatsApp(employee.whatsapp)}
                    </div>
                  )}
                  {employee.role && (
                    <Badge variant="secondary">
                      {employee.role.name}
                    </Badge>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {(employee.employmentTypes || ["Funcionário"]).map((type, index) => (
                      <Badge key={index} variant="outline">
                        {type}
                      </Badge>
                    ))}
                  </div>
                  <Badge variant={employee.isActive ? "default" : "destructive"}>
                    {employee.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}