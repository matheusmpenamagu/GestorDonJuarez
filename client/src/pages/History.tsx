import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { format } from "date-fns";

export default function History() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const { data: historyData, isLoading } = useQuery({
    queryKey: ["/api/history/pours", { start_date: startDate, end_date: endDate }],
    enabled: false, // Only fetch when user searches
  });

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('format', 'csv');
    
    const url = `/api/history/pours?${params.toString()}`;
    window.open(url, '_blank');
  };

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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Histórico de Consumo</h2>
        <p className="text-muted-foreground mt-1">
          Visualize e exporte dados de consumo por período
        </p>
      </div>

      {/* Export Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Exportar Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="start-date">Data Inicial</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">Data Final</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleExportCSV}
                className="w-full"
                disabled={!startDate && !endDate}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : !historyData ? (
            <div className="text-center py-8 text-muted-foreground">
              Selecione um período e clique em "Exportar CSV" para visualizar os dados
            </div>
          ) : historyData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum registro encontrado para o período selecionado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Data/Hora</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Torneira</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Volume</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Ponto de Venda</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Estilo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyData.map((event: any) => (
                    <tr key={event.id} className="hover:bg-muted/50">
                      <td className="py-4 text-sm text-foreground">
                        {formatDateTime(event.datetime)}
                      </td>
                      <td className="py-4 text-sm text-foreground">
                        {event.tap.name || `Torneira ${event.tap.id}`}
                      </td>
                      <td className="py-4 text-sm font-medium text-foreground">
                        {event.pourVolumeMl}ml
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {event.tap.pointOfSale?.name || "N/A"}
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {event.tap.currentBeerStyle?.name || "N/A"}
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
