import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PourEventWithRelations } from "@shared/schema";
import { useWebSocket } from "@/hooks/useWebSocket";

// EBC Color Scale mapping (same as TapCard and BeerStylesManagement)
const ebcColors = [
  { value: 2, name: "Palha", color: "#FFE699" },
  { value: 4, name: "Amarelo claro", color: "#FFD700" },
  { value: 6, name: "Dourado", color: "#DAA520" },
  { value: 8, name: "Âmbar claro", color: "#CD853F" },
  { value: 12, name: "Âmbar", color: "#B8860B" },
  { value: 16, name: "Cobre", color: "#B87333" },
  { value: 20, name: "Marrom claro", color: "#8B4513" },
  { value: 30, name: "Marrom", color: "#654321" },
  { value: 40, name: "Marrom escuro", color: "#3C2415" },
  { value: 80, name: "Preto", color: "#1C1C1C" },
];

const getEbcColor = (ebcValue: number | null | undefined) => {
  if (!ebcValue) return "hsl(20, 90%, 48%)"; // primary color default
  
  const colorRange = ebcColors.find((color, index) => {
    const nextColor = ebcColors[index + 1];
    return ebcValue <= color.value || !nextColor;
  });
  
  return colorRange?.color || "hsl(20, 90%, 48%)";
};

export function RealtimePours() {
  const [recentPours, setRecentPours] = useState<PourEventWithRelations[]>([]);
  const { lastMessage } = useWebSocket('/');

  const { data: initialPours, isLoading } = useQuery({
    queryKey: ["/api/recent-pours"],
    refetchInterval: 2000, // Atualiza a cada 2 segundos
    refetchIntervalInBackground: true, // Continua atualizando mesmo em background
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

  // Limit to last 3 records for compact display
  const displayPours = safePours.slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          Atividade em Tempo Real
        </h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-muted-foreground">Últimos 3 registros</span>
        </div>
      </div>
      
      {displayPours.length === 0 ? (
        <div className="text-center text-muted-foreground py-8 bg-muted/20 rounded-lg">
          Nenhuma atividade recente
        </div>
      ) : (
        <div className="space-y-3">
          {displayPours.map((pour) => {
            // Get EBC color from tap's current beer style
            const ebcColor = getEbcColor(pour.tap?.currentBeerStyle?.ebcColor);
            return (
              <div key={pour.id} className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 border border-dashed">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: ebcColor }}
                  >
                    <span className="text-white text-xs font-bold">{pour.tap.id}</span>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-foreground">
                      {pour.tapName || pour.tap.name || `Torneira ${pour.tap.id}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pour.posName || pour.tap.pointOfSale?.name || "N/A"} • {pour.beerStyleName || pour.tap.currentBeerStyle?.name || "N/A"}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">
                    {pour.pourVolumeMl}ml
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(pour.datetime).split(' ')[1]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
