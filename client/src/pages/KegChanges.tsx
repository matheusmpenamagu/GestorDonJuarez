import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function KegChanges() {
  const { data: kegChanges, isLoading } = useQuery({
    queryKey: ["/api/history/keg-changes"],
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
      timeZone: "America/Sao_Paulo"
    });
  };

  const formatVolume = (volumeMl: number | null) => {
    if (volumeMl === null) return "N/A";
    return `${(volumeMl / 1000).toFixed(1)}L restante`;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Histórico de Trocas de Barril</h2>
        <p className="text-muted-foreground mt-1">
          Acompanhe todas as trocas de barril realizadas
        </p>
      </div>

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
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Data/Hora</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Torneira</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Ponto de Venda</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Volume Anterior</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Status</th>
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
                      <td className="py-4">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
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
