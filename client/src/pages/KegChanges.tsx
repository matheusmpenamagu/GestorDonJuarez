import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function KegChanges() {
  const [showForm, setShowForm] = useState(false);
  const [tapId, setTapId] = useState("");
  const [capacity, setCapacity] = useState("30");
  const { toast } = useToast();

  const { data: kegChanges, isLoading } = useQuery({
    queryKey: ["/api/history/keg-changes"],
  });

  const { data: taps = [] } = useQuery({
    queryKey: ["/api/taps"],
  });

  const addKegChangeMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const isoString = now.toISOString();
      
      return await apiRequest("POST", "/api/webhooks/keg-change", {
        tap_id: parseInt(tapId),
        keg_capacity_liters: parseInt(capacity),
        datetime: isoString
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/history/keg-changes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/taps"] });
      setShowForm(false);
      setTapId("");
      setCapacity("30");
      toast({
        title: "Sucesso",
        description: "Troca de barril registrada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao registrar troca de barril",
        variant: "destructive",
      });
    },
  });

  const formatDateTime = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  };

  const formatVolume = (volumeMl: number | null) => {
    if (volumeMl === null) return "N/A";
    return `${(volumeMl / 1000).toFixed(1)}L restante`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Histórico de Trocas de Barril
          </h2>
          <p className="text-muted-foreground mt-1">
            Acompanhe todas as trocas de barril realizadas
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Registrar Troca
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar Nova Troca de Barril</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tap">Torneira</Label>
                <select
                  id="tap"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={tapId}
                  onChange={(e) => setTapId(e.target.value)}
                >
                  <option value="">Selecione uma torneira</option>
                  {Array.isArray(taps) && taps.map((tap: any) => (
                    <option key={tap.id} value={tap.id}>
                      {tap.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidade do Barril</Label>
                <select
                  id="capacity"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                >
                  <option value="30">30 Litros</option>
                  <option value="50">50 Litros</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => addKegChangeMutation.mutate()}
                disabled={!tapId || addKegChangeMutation.isPending}
              >
                {addKegChangeMutation.isPending ? "Registrando..." : "Registrar Troca"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Trocas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico de trocas...
            </div>
          ) : !kegChanges || kegChanges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma troca de barril registrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                      Data/Hora
                    </th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                      Torneira
                    </th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                      Ponto de Venda
                    </th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                      Volume Anterior
                    </th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                      Capacidade
                    </th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {kegChanges.map((change: any) => (
                    <tr key={change.id} className="hover:bg-muted/50">
                      <td className="py-4 text-sm text-foreground">
                        {formatDateTime(change.datetime)}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
                            <span className="text-white text-sm font-bold">
                              {change.tap.id}
                            </span>
                          </div>
                          <span className="text-sm text-foreground">
                            {change.tap.name || `Torneira ${change.tap.id}`}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {change.tap.pointOfSale?.name || "N/A"}
                      </td>
                      <td className="py-4 text-sm text-foreground">
                        {formatVolume(change.previousVolumeMl)}
                      </td>
                      <td className="py-4 text-sm text-foreground">
                        <Badge variant="outline">
                          {change.kegCapacityLiters || 30}L
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800"
                        >
                          Concluída
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
