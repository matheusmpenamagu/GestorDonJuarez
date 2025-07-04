import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Edit, Trash2, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ChecklistTemplateWithRelations, Unit } from "@shared/schema";

const templateFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  category: z.string().min(1, "Categoria é obrigatória"),
  frequency: z.enum(["daily", "weekly", "monthly", "on_demand"]),
  unitId: z.number().optional().nullable(),
  isActive: z.boolean().default(true),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

export default function ChecklistTemplates() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplateWithRelations | null>(null);
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery<ChecklistTemplateWithRelations[]>({
    queryKey: ["/api/checklist-templates"],
  });

  const { data: units } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      frequency: "on_demand",
      unitId: null,
      isActive: true,
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      return await apiRequest('/api/checklist-templates', {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-templates"] });
      setIsDialogOpen(false);
      form.reset();
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TemplateFormData }) => {
      return await apiRequest(`/api/checklist-templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-templates"] });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      form.reset();
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/checklist-templates/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-templates"] });
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleEdit = (template: ChecklistTemplateWithRelations) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description || "",
      category: template.category,
      frequency: template.frequency as any,
      unitId: template.unitId,
      isActive: template.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este template?")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      daily: "Diário",
      weekly: "Semanal",
      monthly: "Mensal",
      on_demand: "Sob demanda",
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      "limpeza": "bg-blue-100 text-blue-800",
      "seguranca": "bg-red-100 text-red-800",
      "manutencao": "bg-yellow-100 text-yellow-800",
      "qualidade": "bg-green-100 text-green-800",
      "operacional": "bg-purple-100 text-purple-800",
    };
    return colors[category.toLowerCase() as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Templates de Checklist</h1>
            <p className="text-gray-500">Gerencie os modelos de checklist</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates de Checklist</h1>
          <p className="text-gray-500">Gerencie os modelos de checklist</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Editar Template" : "Novo Template"}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate 
                  ? "Edite as informações do template de checklist." 
                  : "Crie um novo template de checklist."}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do template" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descrição do template" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="limpeza">Limpeza</SelectItem>
                            <SelectItem value="seguranca">Segurança</SelectItem>
                            <SelectItem value="manutencao">Manutenção</SelectItem>
                            <SelectItem value="qualidade">Qualidade</SelectItem>
                            <SelectItem value="operacional">Operacional</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequência</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a frequência" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Diário</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                            <SelectItem value="on_demand">Sob demanda</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade (Opcional)</FormLabel>
                      <FormControl>
                        <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} defaultValue={field.value?.toString()}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma unidade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Todas as unidades</SelectItem>
                            {units?.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id.toString()}>
                                {unit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Ativo</FormLabel>
                        <div className="text-sm text-gray-500">
                          Template disponível para uso
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  >
                    {editingTemplate ? "Salvar" : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge className={getCategoryColor(template.category)}>
                      {template.category}
                    </Badge>
                    <Badge variant="outline">
                      {getFrequencyLabel(template.frequency)}
                    </Badge>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    disabled={deleteTemplateMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {template.description && (
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
              )}
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Criado em {format(new Date(template.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                </div>
                
                {template.unitId && (
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Unidade específica
                  </div>
                )}
                
                <div className="pt-2">
                  <Badge variant={template.isActive ? "default" : "secondary"}>
                    {template.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates?.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum template encontrado
          </h3>
          <p className="text-gray-500 mb-4">
            Comece criando seu primeiro template de checklist.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Template
          </Button>
        </div>
      )}
    </div>
  );
}