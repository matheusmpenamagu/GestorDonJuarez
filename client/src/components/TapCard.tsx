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
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold">{tap.id}</span>
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">
                {tap.name || `Torneira ${tap.id}`}
              </h3>
              <p className="text-sm text-muted-foreground">
                {tap.pointOfSale?.name || "Sem ponto de venda"}
              </p>
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full ${isLow ? 'bg-red-500' : 'bg-green-500'} ${!isLow ? 'animate-pulse' : ''}`} />
        </div>
        
        {/* Beer Info */}
        <div className="mb-4">
          <p className="text-sm font-medium text-foreground">
            {tap.currentBeerStyle?.name || "Sem estilo definido"}
          </p>
          <p className="text-xs text-muted-foreground">Estilo atual</p>
        </div>
        
        {/* Volume Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Volume Disponível</span>
            <span className={`font-medium ${isLow ? 'text-red-600' : 'text-foreground'}`}>
              {availableLiters}L
            </span>
          </div>
          <Progress 
            value={volumePercentage} 
            className={`h-2 ${isLow ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              de {totalLiters}L total
            </p>
            {isLow && (
              <div className="flex items-center text-red-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span className="text-xs">Barril baixo</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="text-xs text-muted-foreground">
          <p>Último consumo: {formatLastPour(tap.lastPourEvent)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
