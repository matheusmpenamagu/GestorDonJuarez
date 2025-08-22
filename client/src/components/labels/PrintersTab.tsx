import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Printer, Settings, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Printer {
  id: number;
  name: string;
  serialNumber: string;
  tenant: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PrinterFormData {
  name: string;
  serialNumber: string;
  tenant: string;
  isDefault: boolean;
  isActive: boolean;
}

export default function PrintersTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [formData, setFormData] = useState<PrinterFormData>({
    name: '',
    serialNumber: '',
    tenant: '',
    isDefault: false,
    isActive: true,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: printers = [], isLoading } = useQuery<Printer[]>({
    queryKey: ["/api/printers"],
    queryFn: async () => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        headers['Authorization'] = `Bearer ${sessionId}`;
      }
      
      const response = await fetch('/api/printers', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch printers');
      }
      
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PrinterFormData) => {
      const response = await fetch('/api/printers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("sessionId") || ""}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create printer');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/printers"] });
      setShowForm(false);
      resetForm();
      toast({
        title: "Impressora criada",
        description: "Impressora criada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar impressora",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PrinterFormData> }) => {
      const response = await fetch(`/api/printers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("sessionId") || ""}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update printer');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/printers"] });
      setShowForm(false);
      setEditingPrinter(null);
      resetForm();
      toast({
        title: "Impressora atualizada",
        description: "Impressora atualizada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar impressora",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/printers/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId") || ""}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete printer');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/printers"] });
      toast({
        title: "Impressora excluída",
        description: "Impressora excluída com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir impressora",
        variant: "destructive",
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/printers/${id}/set-default`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId") || ""}`,
        },
      });
      if (!response.ok) throw new Error('Failed to set default printer');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/printers"] });
      toast({
        title: "Impressora padrão definida",
        description: "Impressora padrão definida com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao definir impressora padrão",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      serialNumber: '',
      tenant: '',
      isDefault: false,
      isActive: true,
    });
  };

  const handleEdit = (printer: Printer) => {
    setEditingPrinter(printer);
    setFormData({
      name: printer.name,
      serialNumber: printer.serialNumber,
      tenant: printer.tenant,
      isDefault: printer.isDefault,
      isActive: printer.isActive,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingPrinter) {
      updateMutation.mutate({ id: editingPrinter.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta impressora?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSetDefault = (id: number) => {
    setDefaultMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Impressoras</h2>
        <Button
          onClick={() => {
            resetForm();
            setEditingPrinter(null);
            setShowForm(true);
          }}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Impressora
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando impressoras...</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Padrão</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {printers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Nenhuma impressora cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                printers.map((printer) => (
                  <TableRow key={printer.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-gray-500" />
                        {printer.name}
                      </div>
                    </TableCell>
                    <TableCell>{printer.serialNumber}</TableCell>
                    <TableCell>{printer.tenant}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={printer.isActive ? "default" : "secondary"}
                        className={printer.isActive ? "bg-green-600" : ""}
                      >
                        {printer.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {printer.isDefault ? (
                        <Badge variant="default" className="bg-orange-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Padrão
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(printer.id)}
                          disabled={!printer.isActive}
                        >
                          Definir como padrão
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(printer)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(printer.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPrinter ? "Editar Impressora" : "Nova Impressora"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <UILabel htmlFor="name">Nome *</UILabel>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Zebra ZD230 - Sala 1"
                required
              />
            </div>

            <div className="space-y-2">
              <UILabel htmlFor="serialNumber">Serial Number *</UILabel>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                placeholder="Ex: 22J160800024"
                required
              />
            </div>

            <div className="space-y-2">
              <UILabel htmlFor="tenant">Tenant *</UILabel>
              <Input
                id="tenant"
                value={formData.tenant}
                onChange={(e) => setFormData(prev => ({ ...prev, tenant: e.target.value }))}
                placeholder="Ex: Don Juarez"
                required
              />
            </div>



            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
                />
                <UILabel htmlFor="isActive">Impressora ativa</UILabel>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: !!checked }))}
                />
                <UILabel htmlFor="isDefault">Definir como padrão</UILabel>
              </div>
            </div>
          </form>
          
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}