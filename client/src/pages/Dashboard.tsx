import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TapCard } from "@/components/TapCard";
import { RealtimePours } from "@/components/RealtimePours";
import { TapWithRelations } from "@shared/schema";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Beer, TrendingUp, BarChart3, AlertTriangle } from "lucide-react";

interface DashboardStats {
  activeTaps: number;
  todayVolumeLiters: number;
  weekVolumeLiters: number;
  lowKegs: number;
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
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
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
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Monitoramento de Torneiras
        </h2>
        {taps.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhuma torneira configurada
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {taps.map((tap) => (
              <TapCard key={tap.id} tap={tap} />
            ))}
          </div>
        )}
      </div>

      {/* Real-time Pour Activity */}
      <RealtimePours />
    </div>
  );
}
