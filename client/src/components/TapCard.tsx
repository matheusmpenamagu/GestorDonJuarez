import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TapWithRelations } from "@shared/schema";
import { AlertTriangle } from "lucide-react";

interface TapCardProps {
  tap: TapWithRelations;
}

export function TapCard({ tap }: TapCardProps) {
  const volumePercentage = tap.kegCapacityMl 
    ? Math.round((tap.currentVolumeAvailableMl / tap.kegCapacityMl) * 100)
    : 0;
  
  const isLow = volumePercentage < 10;
  const availableLiters = Math.round(tap.currentVolumeAvailableMl / 1000 * 10) / 10;
  const totalLiters = Math.round((tap.kegCapacityMl || 0) / 1000);

  const formatLastPour = (lastPour?: { datetime: string; pourVolumeMl: number }) => {
    if (!lastPour) return "Nenhum registro";
    
    const date = new Date(lastPour.datetime);
    const time = date.toLocaleTimeString("pt-BR", { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "America/Sao_Paulo"
    });
    return `${time} - ${lastPour.pourVolumeMl}ml`;
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">{tap.id}</span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">
                {tap.name || `Torneira ${tap.id}`}
              </h3>
              <p className="text-xs text-muted-foreground">
                {tap.pointOfSale?.name || "Sem ponto de venda"}
              </p>
            </div>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ${isLow ? 'bg-red-500' : 'bg-green-500'} ${!isLow ? 'animate-pulse' : ''}`} />
        </div>
        
        {/* Beer Info - Compact */}
        <div className="mb-3">
          <p className="text-xs font-medium text-foreground">
            {tap.currentBeerStyle?.name || "Sem estilo definido"}
          </p>
        </div>
        
        {/* Volume Progress - Compact */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Disponível</span>
            <span className={`font-medium ${isLow ? 'text-red-600' : 'text-foreground'}`}>
              {availableLiters}L / {totalLiters}L
            </span>
          </div>
          <Progress 
            value={volumePercentage} 
            className={`h-1.5 ${isLow ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
          />
          {isLow && (
            <div className="flex items-center text-red-600 mt-1">
              <AlertTriangle className="h-3 w-3 mr-1" />
              <span className="text-xs">Barril baixo</span>
            </div>
          )}
        </div>
        
        {/* Recent Activity - Compact */}
        <div className="text-xs text-muted-foreground">
          <p>Último: {formatLastPour(tap.lastPourEvent)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
