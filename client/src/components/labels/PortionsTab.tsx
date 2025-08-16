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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Trash2, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PortionForm from "./PortionForm";

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
  createdAt: string;
  updatedAt: string;
}

export default function PortionsTab() {
  const [editingPortion, setEditingPortion] = useState<ProductPortion | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: portions = [], isLoading } = useQuery<ProductPortion[]>({
    queryKey: ["/api/labels/portions"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/labels/portions/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId") || ""}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete portion");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels/portions"] });
      toast({
        title: "Porcionamento excluído",
        description: "Porcionamento excluído com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir porcionamento",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (portion: ProductPortion) => {
    setEditingPortion(portion);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este porcionamento?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPortion(null);
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || "Produto não encontrado";
  };

  const getUnitDisplay = (unit: string) => {
    const units: Record<string, string> = {
      'g': 'gramas',
      'kg': 'quilos',
      'ml': 'mililitros',
      'l': 'litros',
      'un': 'unidades',
      'fatias': 'fatias',
      'porções': 'porções'
    };
    return units[unit] || unit;
  };



  if (isLoading) {
    return <div>Carregando porcionamentos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Porcionamentos dos Produtos</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure as unidades de medida e quantidades para cada produto
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar Porcionamento
        </Button>
      </div>

      {/* Table */}
      {portions.length === 0 ? (
        <Alert>
          <AlertDescription>
            Nenhum porcionamento cadastrado. Clique em "Adicionar Porcionamento" para começar.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Quantidade</TableHead>
                <TableHead className="text-center">Unidade</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portions.map((portion) => (
                <TableRow key={portion.id}>
                  <TableCell className="font-medium">
                    {getProductName(portion.productId)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit mx-auto">
                      <Scale className="w-3 h-3" />
                      {portion.quantity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {getUnitDisplay(portion.unitOfMeasure)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(portion)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(portion.id)}
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
      <PortionForm
        open={showForm}
        onOpenChange={handleFormClose}
        portion={editingPortion}
        products={products}
      />
    </div>
  );
}