import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PourEventWithRelations } from "@shared/schema";
import { useWebSocket } from "@/hooks/useWebSocket";

export function RealtimePours() {
  const [recentPours, setRecentPours] = useState<PourEventWithRelations[]>([]);
  const { lastMessage } = useWebSocket('/');

  const { data: initialPours, isLoading } = useQuery({
    queryKey: ["/api/recent-pours"],
  });

  // Ensure recentPours is always an array
  const safePours = Array.isArray(recentPours) ? recentPours : [];

  // Update recent pours when WebSocket data arrives
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'initial_data':
          if (lastMessage.data.recentPours && Array.isArray(lastMessage.data.recentPours)) {
            setRecentPours(lastMessage.data.recentPours);
          }
          break;
        case 'pour_event':
          if (lastMessage.data && Array.isArray(lastMessage.data)) {
            setRecentPours(lastMessage.data);
          }
          break;
      }
    }
  }, [lastMessage]);

  // Set initial data from React Query
  useEffect(() => {
    if (initialPours && Array.isArray(initialPours) && !lastMessage) {
      setRecentPours(initialPours);
    }
  }, [initialPours, lastMessage]);

  const formatDateTime = (datetime: string | Date) => {
    const date = typeof datetime === 'string' ? new Date(datetime) : datetime;
    return date.toLocaleString("pt-BR", { 
      day: "2-digit",
      month: "2-digit", 
      hour: "2-digit", 
      minute: "2-digit",
      second: "2-digit",
      timeZone: "America/Sao_Paulo"
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Atividade em Tempo Real
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-muted rounded-full" />
              <span className="text-sm text-muted-foreground">Carregando...</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Carregando dados em tempo real...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Atividade em Tempo Real
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">Atualização automática</span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {safePours.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Nenhuma atividade recente
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm font-medium text-muted-foreground">Horário</th>
                  <th className="text-left py-2 text-sm font-medium text-muted-foreground">Torneira</th>
                  <th className="text-left py-2 text-sm font-medium text-muted-foreground">Volume</th>
                  <th className="text-left py-2 text-sm font-medium text-muted-foreground">Ponto de Venda</th>
                  <th className="text-left py-2 text-sm font-medium text-muted-foreground">Estilo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {safePours.map((pour) => (
                  <tr key={pour.id} className="hover:bg-muted/50">
                    <td className="py-3 text-sm text-foreground">
                      {formatDateTime(pour.datetime)}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
                          <span className="text-white text-sm font-bold">{pour.tap.id}</span>
                        </div>
                        <span className="text-sm text-foreground">
                          {pour.tap.name || `Torneira ${pour.tap.id}`}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-sm font-medium text-foreground">
                      {pour.pourVolumeMl}ml
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">
                      {pour.tap.pointOfSale?.name || "N/A"}
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">
                      {pour.tap.currentBeerStyle?.name || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
