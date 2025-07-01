import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Filter, Beer, RefreshCw, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface TimelineEvent {
  id: number;
  type: "pour" | "keg_change";
  datetime: string;
  tapName: string;
  posName: string;
  beerStyleName?: string;
  totalVolumeMl?: number;
  deviceCode?: string;
}

export default function History() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTap, setSelectedTap] = useState("");

  // Get pour events
  const { data: pourEvents = [], isLoading: isLoadingPours } = useQuery({
    queryKey: ["/api/history/pours", startDate, endDate, selectedTap],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedTap) params.append('tap_id', selectedTap);
      
      const response = await fetch(`/api/history/pours?${params}`);
      if (!response.ok) throw new Error('Failed to fetch pour events');
      return response.json();
    },
    enabled: true,
  });

  // Get keg change events
  const { data: kegChangeEvents = [], isLoading: isLoadingKegs } = useQuery({
    queryKey: ["/api/history/keg-changes", startDate, endDate, selectedTap],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedTap) params.append('tap_id', selectedTap);
      
      const response = await fetch(`/api/history/keg-changes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch keg change events');
      return response.json();
    },
    enabled: true,
  });

  // Get taps for filter
  const { data: taps = [] } = useQuery({
    queryKey: ["/api/taps"],
  });

  // Combine and sort events
  const timelineEvents: TimelineEvent[] = [
    ...(Array.isArray(pourEvents) ? pourEvents : []).map((event: any) => ({
      ...event,
      type: "pour" as const,
    })),
    ...(Array.isArray(kegChangeEvents) ? kegChangeEvents : []).map(
      (event: any) => ({
        ...event,
        type: "keg_change" as const,
      }),
    ),
  ].sort(
    (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
  );

  const isLoading = isLoadingPours || isLoadingKegs;

  const getEventIcon = (type: string) => {
    return type === "pour" ? Beer : RefreshCw;
  };

  const getEventBgColor = (type: string) => {
    return type === "pour" ? "bg-primary" : "bg-green-600";
  };

  const formatDateTime = (datetime: string) => {
    try {
      // Try parsing the datetime string
      let date: Date;
      
      if (datetime.includes('T')) {
        // Already in ISO format
        date = parseISO(datetime);
      } else if (datetime.includes(' ')) {
        // Format like "2024-01-01 12:00:00"
        date = parseISO(datetime.replace(' ', 'T'));
      } else {
        // Fallback
        date = new Date(datetime);
      }
      
      if (isNaN(date.getTime())) {
        return { date: 'Data inválida', time: 'Hora inválida' };
      }
      
      return {
        date: format(date, "dd/MM/yyyy", { locale: ptBR }),
        time: format(date, "HH:mm:ss", { locale: ptBR })
      };
    } catch (error) {
      console.error('Error formatting datetime:', datetime, error);
      return { date: 'Data inválida', time: 'Hora inválida' };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Histórico</h1>
        <p className="text-muted-foreground">
          Timeline de consumo e trocas de barril
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtre o histórico por período e torneira específica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Data Inicial</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Data Final</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tap-filter">Torneira</Label>
              <select
                id="tap-filter"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={selectedTap}
                onChange={(e) => setSelectedTap(e.target.value)}
              >
                <option value="">Todas as torneiras</option>
                {(Array.isArray(taps) ? taps : []).map((tap: any) => (
                  <option key={tap.id} value={tap.id}>
                    {tap.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline de Atividades
          </CardTitle>
          <CardDescription>
            {timelineEvents.length} evento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando histórico...</p>
            </div>
          ) : timelineEvents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhum evento encontrado para os filtros selecionados
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>

              <div className="space-y-6">
                {timelineEvents.map((event, index) => {
                  const Icon = getEventIcon(event.type);
                  const eventBgColor = getEventBgColor(event.type);

                  return (
                    <div
                      key={`${event.type}-${event.id}`}
                      className="relative flex items-start gap-4"
                    >
                      {/* Timeline dot */}
                      <div
                        className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full ${eventBgColor} text-white`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Event content */}
                      <div className="flex-1 min-w-0">
                        <div className="bg-card border rounded-lg p-4 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-sm">
                                  {event.type === "pour"
                                    ? "Consumo de Chope"
                                    : "Troca de Barril"}
                                </h3>
                                <Badge variant="outline" className="text-xs">
                                  {event.tapName}
                                </Badge>
                              </div>

                              <div className="space-y-1 text-sm text-muted-foreground">
                                <p className="flex items-center gap-2">
                                  <span className="font-medium">Local:</span>
                                  {event.posName}
                                </p>

                                {event.beerStyleName && (
                                  <p className="flex items-center gap-2">
                                    <span className="font-medium">Estilo:</span>
                                    {event.beerStyleName}
                                  </p>
                                )}

                                {event.type === "pour" &&
                                  event.totalVolumeMl && (
                                    <p className="flex items-center gap-2">
                                      <span className="font-medium">
                                        Volume:
                                      </span>
                                      <span className="font-mono text-foreground">
                                        {event.totalVolumeMl.toLocaleString()}{" "}
                                        ml
                                      </span>
                                    </p>
                                  )}

                                {event.deviceCode && (
                                  <p className="flex items-center gap-2">
                                    <span className="font-medium">
                                      Dispositivo:
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {event.deviceCode}
                                    </Badge>
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              {(() => {
                                const { date, time } = formatDateTime(event.datetime);
                                return (
                                  <>
                                    <p className="text-sm font-medium">{date}</p>
                                    <p className="text-xs text-muted-foreground">{time}</p>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
