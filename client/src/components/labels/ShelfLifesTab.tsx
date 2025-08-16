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
import { Plus, Edit, Trash2, Clock, Snowflake, Refrigerator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ShelfLifeForm from "./ShelfLifeForm";

interface Product {
  id: number;
  name: string;
  category: string;
}

interface ProductShelfLife {
  id: number;
  productId: number;
  frozenDays: number;
  chilledDays: number;
  createdAt: string;
  updatedAt: string;
}

export default function ShelfLifesTab() {
  const [editingShelfLife, setEditingShelfLife] = useState<ProductShelfLife | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: shelfLifes = [], isLoading } = useQuery<ProductShelfLife[]>({
    queryKey: ["/api/labels/shelf-lifes"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/labels/shelf-lifes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId") || ""}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete shelf life");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels/shelf-lifes"] });
      toast({
        title: "Validade excluída",
        description: "Validade excluída com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir validade",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (shelfLife: ProductShelfLife) => {
    setEditingShelfLife(shelfLife);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta validade?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingShelfLife(null);
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || "Produto não encontrado";
  };

  if (!activeEmployee) {
    return (
      <Alert>
        <AlertDescription>
          Você precisa se autenticar para gerenciar as validades dos produtos.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <div>Carregando validades...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Validades dos Produtos</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure os prazos de validade para produtos congelados e refrigerados
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar Validade
        </Button>
      </div>

      {/* Table */}
      {shelfLifes.length === 0 ? (
        <Alert>
          <AlertDescription>
            Nenhuma validade cadastrada. Clique em "Adicionar Validade" para começar.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Snowflake className="w-4 h-4" />
                    Congelado (dias)
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Refrigerator className="w-4 h-4" />
                    Refrigerado (dias)
                  </div>
                </TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shelfLifes.map((shelfLife) => (
                <TableRow key={shelfLife.id}>
                  <TableCell className="font-medium">
                    {getProductName(shelfLife.productId)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit mx-auto">
                      <Clock className="w-3 h-3" />
                      {shelfLife.frozenDays} dias
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit mx-auto">
                      <Clock className="w-3 h-3" />
                      {shelfLife.chilledDays} dias
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(shelfLife)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(shelfLife.id)}
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
      <ShelfLifeForm
        open={showForm}
        onOpenChange={handleFormClose}
        shelfLife={editingShelfLife}
        products={products}
      />
    </div>
  );
}