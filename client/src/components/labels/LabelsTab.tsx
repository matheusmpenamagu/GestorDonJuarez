import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Trash2, Calendar, QrCode, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LabelForm from "./LabelForm";

interface Product {
  id: number;
  name: string;
  category: string;
}



interface ProductPortion {
  id: number;
  productId: number;
  quantity: number;
  unitOfMeasure: string;
}

interface Label {
  id: number;
  productId: number;
  responsibleId: number;
  date: string;
  portionId: number;
  expiryDate: string;
  storageMethod: string;
  identifier: string;
  createdAt: string;
  updatedAt: string;
}

export default function LabelsTab() {
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });



  const { data: portions = [] } = useQuery<ProductPortion[]>({
    queryKey: ["/api/labels/portions"],
  });

  const { data: labels = [], isLoading } = useQuery<Label[]>({
    queryKey: ["/api/labels"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/labels/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId") || ""}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete label");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels"] });
      toast({
        title: "Etiqueta excluída",
        description: "Etiqueta excluída com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir etiqueta",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (label: Label) => {
    setEditingLabel(label);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta etiqueta?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingLabel(null);
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || "Produto não encontrado";
  };

  const getEmployeeName = (employeeId: number) => {
    // Since we now use logged-in user, we'll show a generic message
    return "Funcionário";
  };

  const getPortion = (portionId: number) => {
    const portion = portions.find(p => p.id === portionId);
    if (!portion) return "Porção não encontrada";
    
    const unitDisplay = {
      'g': 'g',
      'kg': 'kg',
      'ml': 'ml',
      'l': 'l',
      'un': 'un',
      'fatias': 'fatias',
      'porções': 'porções'
    }[portion.unitOfMeasure] || portion.unitOfMeasure;
    
    return `${portion.quantity} ${unitDisplay}`;
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return expiry >= today && expiry <= tomorrow;
  };

  const getStorageMethodDisplay = (storageMethod: string) => {
    const methods = {
      'congelado': { icon: '🧊', label: 'Congelado' },
      'resfriado': { icon: '❄️', label: 'Resfriado' },
      'temperatura_ambiente': { icon: '🌡️', label: 'Ambiente' }
    };
    
    const method = methods[storageMethod as keyof typeof methods];
    return method ? { icon: method.icon, label: method.label } : { icon: '❓', label: 'Desconhecido' };
  };



  if (isLoading) {
    return <div>Carregando etiquetas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Etiquetas Geradas</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Visualize e gerencie todas as etiquetas criadas
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Gerar Etiqueta
        </Button>
      </div>

      {/* Table */}
      {labels.length === 0 ? (
        <Alert>
          <AlertDescription>
            Nenhuma etiqueta gerada. Clique em "Gerar Etiqueta" para começar.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identificador</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Porção</TableHead>
                <TableHead>Armazenamento</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Data Produção</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labels.map((label) => (
                <TableRow key={label.id}>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <QrCode className="w-3 h-3" />
                      {label.identifier}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {getProductName(label.productId)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getPortion(label.portionId)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span>{getStorageMethodDisplay(label.storageMethod).icon}</span>
                      <span className="text-sm">{getStorageMethodDisplay(label.storageMethod).label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {getEmployeeName(label.responsibleId)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(label.date), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        isExpired(label.expiryDate) 
                          ? "destructive" 
                          : isExpiringSoon(label.expiryDate) 
                            ? "secondary" 
                            : "outline"
                      }
                      className="flex items-center gap-1 w-fit"
                    >
                      <Calendar className="w-3 h-3" />
                      {format(new Date(label.expiryDate), "dd/MM/yyyy", { locale: ptBR })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(label)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(label.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form Dialog */}
      <LabelForm
        open={showForm}
        onOpenChange={handleFormClose}
        label={editingLabel}
        products={products}
        portions={portions}
      />
    </div>
  );
}