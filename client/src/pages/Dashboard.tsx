import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TapCard } from "@/components/TapCard";
import { RealtimePours } from "@/components/RealtimePours";
import { TapWithRelations } from "@shared/schema";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Beer, TrendingUp, BarChart3, AlertTriangle, Wind, Activity, TrendingDown } from "lucide-react";

interface DashboardStats {
  activeTaps: number;
  todayVolumeLiters: number;
  weekVolumeLiters: number;
  lowKegs: number;
}

interface Co2Stats {
  last30DaysTotal: { kg: number; cost: number };
  previous30DaysTotal: { kg: number; cost: number };
  percentageChange: number;
  kgPerLiterLast30Days: number;
  kgPerLiterPrevious30Days: number;
  efficiencyChange: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [taps, setTaps] = useState<TapWithRelations[]>([]);
  const { lastMessage } = useWebSocket("/");

  // Initial data queries
  const { data: initialStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: initialTaps } = useQuery({
    queryKey: ["/api/taps"],
  });

  const { data: co2Stats } = useQuery<Co2Stats>({
    queryKey: ["/api/co2-stats"],
  });

  // Update state when WebSocket data arrives
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case "initial_data":
          if (lastMessage.data.stats) setStats(lastMessage.data.stats);
          if (lastMessage.data.taps && Array.isArray(lastMessage.data.taps)) {
            setTaps(lastMessage.data.taps);
          }
          break;
        case "stats_updated":
          if (lastMessage.data) setStats(lastMessage.data);
          break;
        case "taps_updated":
          if (lastMessage.data && Array.isArray(lastMessage.data)) {
            setTaps(lastMessage.data);
          }
          break;
      }
    }
  }, [lastMessage]);

  // Set initial data from React Query
  useEffect(() => {
    if (initialStats && !lastMessage) {
      setStats(initialStats);
    }
  }, [initialStats, lastMessage]);

  useEffect(() => {
    if (initialTaps && Array.isArray(initialTaps) && !lastMessage) {
      setTaps(initialTaps);
    }
  }, [initialTaps, lastMessage]);

  const formatPercentage = (value: number) => {
    const isPositive = value >= 0;
    const formatted = Math.abs(value).toFixed(1);
    return { value: `${isPositive ? '+' : '-'}${formatted}%`, isPositive };
  };

  const statsCards = [
    {
      title: "Torneiras Ativas",
      value: stats?.activeTaps || 0,
      icon: Beer,
      color: "text-primary",
    },
    {
      title: "Hoje (Litros)",
      value: stats?.todayVolumeLiters || 0,
      icon: BarChart3,
      color: "text-green-600",
    },
    {
      title: "Esta Semana",
      value: stats?.weekVolumeLiters || 0,
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      title: "Barris Baixos",
      value: stats?.lowKegs || 0,
      icon: AlertTriangle,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Consumo de Chopes Box */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Beer className="h-6 w-6 text-primary" />
            Consumo de chopes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <div className="ml-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          {stat.title}
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {typeof stat.value === "number"
                            ? stat.value.toLocaleString("pt-BR")
                            : stat.value}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Taps Grid */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Monitoramento de Torneiras
            </h3>
            {taps.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Nenhuma torneira configurada
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {taps.map((tap) => (
                  <TapCard key={tap.id} tap={tap} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CO2 Box */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Wind className="h-6 w-6 text-primary" />
            CO2
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total CO2 Card */}
            <Card className="border-dashed">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wind className="h-5 w-5 text-primary" />
                      <span className="font-medium">Total CO2 (30 dias)</span>
                    </div>
                    {co2Stats && (
                      <Badge
                        variant={
                          formatPercentage(co2Stats.percentageChange).isPositive
                            ? "destructive"
                            : "default"
                        }
                        className="text-xs"
                      >
                        {formatPercentage(co2Stats.percentageChange).value}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {co2Stats?.last30DaysTotal.kg.toLocaleString("pt-BR") || 0} kg
                    </div>
                    <div className="text-lg text-muted-foreground">
                      R$ {co2Stats?.last30DaysTotal.cost.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || "0,00"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Anterior: {co2Stats?.previous30DaysTotal.kg.toLocaleString("pt-BR") || 0} kg
                      (R$ {co2Stats?.previous30DaysTotal.cost.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || "0,00"})
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Efficiency Card */}
            <Card className="border-dashed">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      <span className="font-medium">Eficiência CO2/Litro</span>
                    </div>
                    {co2Stats && (
                      <Badge
                        variant={
                          formatPercentage(co2Stats.efficiencyChange).isPositive
                            ? "destructive"
                            : "default"
                        }
                        className="text-xs"
                      >
                        {formatPercentage(co2Stats.efficiencyChange).value}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {co2Stats?.kgPerLiterLast30Days.toFixed(4) || "0.0000"} kg/L
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Anterior: {co2Stats?.kgPerLiterPrevious30Days.toFixed(4) || "0.0000"} kg/L
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {co2Stats?.efficiencyChange !== undefined && co2Stats.efficiencyChange < 0
                        ? "Eficiência melhorou"
                        : "Eficiência piorou"
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Pour Activity */}
      <RealtimePours />
    </div>
  );
}
