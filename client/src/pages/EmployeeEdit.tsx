import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, User, Save } from "lucide-react";
import { EmployeeWithRelations } from "@shared/schema";

interface EmployeeFormData {
  email: string;
  password: string;
  pin: string;
  firstName: string;
  lastName: string;
  whatsapp: string;
  roleId: number | null;
  employmentTypes: ("Sócio" | "Funcionário" | "Freelancer")[];
  avatar: string;
  isActive: boolean;
}

// Função para formatar WhatsApp com máscara (99) 99999-9999
const formatWhatsApp = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 2) {
    return `(${numbers}`;
  } else if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  }
};

// Função para limpar WhatsApp (apenas dígitos)
const cleanWhatsApp = (value: string): string => {
  return value.replace(/\D/g, '');
};

export default function EmployeeEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isNew = id === 'new';
  const employeeId = isNew ? null : parseInt(id || '', 10);

  const [formData, setFormData] = useState<EmployeeFormData>({
    email: "",
    password: "",
    pin: "",
    firstName: "",
    lastName: "",
    whatsapp: "",
    roleId: null,
    employmentTypes: ["Funcionário"],
    avatar: "😊",
    isActive: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employee, isLoading: employeeLoading, error } = useQuery({
    queryKey: [`/api/employees/${employeeId}`],
    enabled: !isNew && !!employeeId,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      console.log('🔧 [EMPLOYEE-EDIT] Custom queryFn called for employeeId:', employeeId);
      try {
        const storedSessionId = localStorage.getItem('sessionId');
        const response = await fetch(`/api/employees/${employeeId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${storedSessionId}`,
          },
          credentials: 'include',
        });
        
        console.log('🔧 [EMPLOYEE-EDIT] Response status:', response.status);
        console.log('🔧 [EMPLOYEE-EDIT] Response ok:', response.ok);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log('🔧 [EMPLOYEE-EDIT] Raw response text:', text);
        
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.log('🔧 [EMPLOYEE-EDIT] JSON parse error:', parseError);
          console.log('🔧 [EMPLOYEE-EDIT] Response headers:', [...response.headers.entries()]);
          throw new Error(`Invalid JSON response: ${text}`);
        }
        
        console.log('🔧 [EMPLOYEE-EDIT] Custom fetch result:', data);
        return data;
      } catch (error) {
        console.log('🔧 [EMPLOYEE-EDIT] Custom fetch error:', error);
        throw error;
      }
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["/api/roles"],
  });

  useEffect(() => {
    console.log('🔧 [EMPLOYEE-EDIT] useEffect:', { employee, isNew, employeeId });
    if (employee && !isNew) {
      console.log('🔧 [EMPLOYEE-EDIT] Setting form data with:', employee);
      const newFormData = {
        email: employee.email || "",
        password: "",
        pin: "", // PIN is not loaded for security
        firstName: employee.firstName || "",
        lastName: employee.lastName || "",
        whatsapp: formatWhatsApp(employee.whatsapp || ""),
        roleId: employee.roleId || null,
        employmentTypes: (employee.employmentTypes || ["Funcionário"]) as ("Sócio" | "Funcionário" | "Freelancer")[],
        avatar: employee.avatar || "😊",
        isActive: employee.isActive ?? true,
      };
      setFormData(newFormData);
      console.log('🔧 [EMPLOYEE-EDIT] Form data updated:', newFormData);
    } else {
      console.log('🔧 [EMPLOYEE-EDIT] No employee data to set');
    }
  }, [employee, isNew, employeeId]);

  const saveMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const cleanData = { ...data, whatsapp: cleanWhatsApp(data.whatsapp) };
      
      if (isNew) {
        await apiRequest('POST', '/api/employees', cleanData);
      } else {
        await apiRequest('PUT', `/api/employees/${employeeId}`, cleanData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Sucesso",
        description: `Colaborador ${isNew ? 'criado' : 'atualizado'} com sucesso!`,
      });
      navigate('/pessoas/colaboradores');
    },
    onError: (error) => {
      console.error("Error saving employee:", error);
      toast({
        title: "Erro",
        description: error.message || `Erro ao ${isNew ? 'criar' : 'atualizar'} colaborador`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleBack = () => {
    navigate('/pessoas/colaboradores');
  };

  if (employeeLoading && !isNew) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando colaborador...</p>
        </div>
      </div>
    );
  }

  console.log('🔧 [EMPLOYEE-EDIT] Current state:', {
    formData, 
    employeeLoading, 
    employee,
    error,
    isNew,
    employeeId,
    enabled: !isNew && !!employeeId
  });
  
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Colaboradores
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <User className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            {isNew ? "Novo Colaborador" : "Editar Colaborador"}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {isNew ? "Preencha os dados do novo colaborador" : "Altere os dados do colaborador"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Ex: João"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="lastName">Sobrenome *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Ex: Silva"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: joao.silva@donjuarez.com"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={formatWhatsApp(formData.whatsapp)}
                  onChange={(e) => {
                    const formatted = formatWhatsApp(e.target.value);
                    setFormData({ ...formData, whatsapp: formatted });
                  }}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
              </div>

              <div>
                <Label htmlFor="pin">PIN (4 dígitos para tablet)</Label>
                <Input
                  id="pin"
                  type="text"
                  value={formData.pin}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    if (digits.length <= 4) {
                      setFormData({ ...formData, pin: digits });
                    }
                  }}
                  placeholder="0000"
                  maxLength={4}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">
                {!isNew ? "Nova Senha (deixe em branco para manter)" : "Senha *"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Digite a senha"
                required={isNew}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Cargo</Label>
                <Select 
                  value={formData.roleId?.toString() || ""} 
                  onValueChange={(value) => setFormData({ ...formData, roleId: value ? parseInt(value) : null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(roles) ? roles : []).map((role: any) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="avatar">Emoji do Colaborador</Label>
                <Select 
                  value={formData.avatar} 
                  onValueChange={(value) => setFormData({ ...formData, avatar: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um emoji" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="😊">😊 Sorridente</SelectItem>
                    <SelectItem value="😎">😎 Legal</SelectItem>
                    <SelectItem value="🤓">🤓 Nerd</SelectItem>
                    <SelectItem value="😄">😄 Feliz</SelectItem>
                    <SelectItem value="🥳">🥳 Festa</SelectItem>
                    <SelectItem value="🤩">🤩 Estrela</SelectItem>
                    <SelectItem value="😇">😇 Anjo</SelectItem>
                    <SelectItem value="🤔">🤔 Pensativo</SelectItem>
                    <SelectItem value="😉">😉 Piscadinha</SelectItem>
                    <SelectItem value="🙂">🙂 Simpático</SelectItem>
                    <SelectItem value="🤗">🤗 Abraço</SelectItem>
                    <SelectItem value="👨‍💼">👨‍💼 Executivo</SelectItem>
                    <SelectItem value="👩‍💼">👩‍💼 Executiva</SelectItem>
                    <SelectItem value="👨‍🍳">👨‍🍳 Chef</SelectItem>
                    <SelectItem value="👩‍🍳">👩‍🍳 Chef</SelectItem>
                    <SelectItem value="🧑‍💻">🧑‍💻 Programador</SelectItem>
                    <SelectItem value="🤵">🤵 Formal</SelectItem>
                    <SelectItem value="👨‍🏫">👨‍🏫 Professor</SelectItem>
                    <SelectItem value="👩‍🏫">👩‍🏫 Professora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Vínculo com a Empresa</Label>
              <div className="space-y-3 mt-3 p-4 border rounded-lg bg-muted/20">
                {(["Sócio", "Funcionário", "Freelancer"] as const).map((type) => (
                  <div key={type} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={`employment-${type}`}
                      checked={formData.employmentTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ 
                            ...formData, 
                            employmentTypes: [...formData.employmentTypes, type] 
                          });
                        } else {
                          setFormData({ 
                            ...formData, 
                            employmentTypes: formData.employmentTypes.filter(t => t !== type) 
                          });
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor={`employment-${type}`} className="text-sm font-medium">
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/20">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="font-medium">
                Colaborador ativo no sistema
              </Label>
            </div>
            
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                type="submit" 
                disabled={saveMutation.isPending}
                className="flex-1 md:flex-none"
              >
                <Save className="mr-2 h-4 w-4" />
                {isNew ? "Criar Colaborador" : "Salvar Alterações"}
              </Button>
              <Button type="button" variant="outline" onClick={handleBack}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}