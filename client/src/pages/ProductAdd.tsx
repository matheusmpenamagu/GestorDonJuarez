import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Package, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProductCategory, Unit } from "@shared/schema";

export default function ProductAdd() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    stockCategory: "",
    unitOfMeasure: "",
    currentValue: "",
  });

  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);

  const { data: categories = [] } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"],
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/products/multi-unit", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Produto criado",
        description: "Produto criado e associado às unidades selecionadas!",
      });
      setLocation("/estoque/produtos");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar produto",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedUnits.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos uma unidade",
        variant: "destructive",
      });
      return;
    }
    
    const productData = {
      code: formData.code,
      name: formData.name,
      stockCategory: parseInt(formData.stockCategory),
      unitOfMeasure: formData.unitOfMeasure,
      currentValue: parseFloat(formData.currentValue),
      units: selectedUnits.map(id => parseInt(id))
    };

    createMutation.mutate(productData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/estoque/produtos")}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6 text-orange-600" />
          <h1 className="text-2xl font-bold">Adicionar Produto</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Produto</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stockCategory">Categoria</Label>
                <Select
                  value={formData.stockCategory}
                  onValueChange={(value) => setFormData({ ...formData, stockCategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitOfMeasure">Unidade de Medida</Label>
                <Input
                  id="unitOfMeasure"
                  value={formData.unitOfMeasure}
                  onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                  placeholder="Ex: kg, lt, un"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentValue">Valor Atual (R$)</Label>
              <Input
                id="currentValue"
                type="number"
                step="0.01"
                value={formData.currentValue}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                required
                className="md:w-1/2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="units">Unidades</Label>
              <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-3">
                {units.map((unit) => (
                  <div key={unit.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={`unit-${unit.id}`}
                      checked={selectedUnits.includes(unit.id.toString())}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUnits([...selectedUnits, unit.id.toString()]);
                        } else {
                          setSelectedUnits(selectedUnits.filter(id => id !== unit.id.toString()));
                        }
                      }}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <Label htmlFor={`unit-${unit.id}`} className="text-sm font-normal cursor-pointer">
                      {unit.name}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedUnits.length === 0 && (
                <p className="text-sm text-gray-500">Selecione pelo menos uma unidade</p>
              )}
              {selectedUnits.length > 0 && (
                <p className="text-sm text-green-600">
                  {selectedUnits.length} unidade{selectedUnits.length > 1 ? 's' : ''} selecionada{selectedUnits.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLocation("/estoque/produtos")}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-orange-600 hover:bg-orange-700"
                disabled={createMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "Criando..." : "Criar Produto"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}