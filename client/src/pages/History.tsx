import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Filter, Beer, RefreshCw, Clock, ChevronDown, ChevronUp, Wrench, Store, Smartphone } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TapsManagement from "@/pages/TapsManagement";
import POSManagement from "@/pages/POSManagement";
import BeerStylesManagement from "@/pages/BeerStylesManagement";
import DevicesManagement from "@/pages/DevicesManagement";

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

function HistoryTimeline() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTap, setSelectedTap] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof TimelineEvent>("datetime");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ["/api/timeline"],
  });

  const { data: taps } = useQuery({
    queryKey: ["/api/taps"],
  });

  const { data: beerStyles } = useQuery({
    queryKey: ["/api/beer-styles"],
  });

  const { data: pointsOfSale } = useQuery({
    queryKey: ["/api/points-of-sale"],
  });

  const { data: devices } = useQuery({
    queryKey: ["/api/devices"],
  });

  const filteredEvents = events ? (events as TimelineEvent[]).filter((event: TimelineEvent) => {
    if (startDate) {
      let date: Date;
      
      if (event.datetime.includes('T')) {
        date = parseISO(event.datetime);
      } else {
        const [datePart] = event.datetime.split(' ');
        const [day, month, year] = datePart.split('/');
        const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        date = parseISO(isoString);
      }
      
      if (date < parseISO(startDate)) return false;
    }

    if (endDate) {
      let date: Date;
      
      if (event.datetime.includes('T')) {
        date = parseISO(event.datetime);
      } else {
        const [datePart] = event.datetime.split(' ');
        const [day, month, year] = datePart.split('/');
        const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        date = parseISO(isoString);
      }
      
      if (date > parseISO(endDate)) return false;
    }

    if (selectedTap && event.tapName !== selectedTap) return false;

    return true;
  }) : [];

  const hasActiveFilters = startDate || endDate || selectedTap;

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedTap("");
  };

  const getEventIcon = (type: string) => {
    return type === "pour" ? <Beer className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />;
  };

  const formatEventDateTime = (datetime: string) => {
    try {
      let date: Date;
      
      if (datetime.includes('T')) {
        date = parseISO(datetime);
      } else {
        const [datePart, timePart] = datetime.split(' ');
        const [day, month, year] = datePart.split('/');
        const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart || '00:00:00'}`;
        date = parseISO(isoString);
      }
      
      if (isNaN(date.getTime())) {
        return { date: 'Data inválida', time: 'Hora inválida' };
      }
      
      return {
        date: format(date, "dd/MM/yyyy", { locale: ptBR }),
        time: format(date, "HH:mm", { locale: ptBR })
      };
    } catch (error) {
      console.error('Error formatting date:', error);
      return { date: 'Data inválida', time: 'Hora inválida' };
    }
  };

  const handleSort = (column: keyof TimelineEvent) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    let aValue = a[sortColumn];
    let bValue = b[sortColumn];

    // Handle datetime sorting specially
    if (sortColumn === "datetime") {
      aValue = new Date(a.datetime).getTime();
      bValue = new Date(b.datetime).getTime();
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline de Eventos
          </CardTitle>
          <CardDescription>
            Histórico cronológico de consumo de chopes e trocas de barril
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="mb-6">
            <div className="border border-dashed border-muted-foreground/30 rounded-lg">
              <div className="p-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex items-center justify-between w-full p-2 h-auto hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Filtros</span>
                    </div>
                    {filtersOpen ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="px-3 pb-3 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-date" className="text-sm">Data inicial</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end-date" className="text-sm">Data final</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tap-select" className="text-sm">Torneira</Label>
                      <select
                        id="tap-select"
                        value={selectedTap}
                        onChange={(e) => setSelectedTap(e.target.value)}
                        className="h-9 w-full px-3 py-1 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="">Todas as torneiras</option>
                        {taps && (taps as any[]).map((tap: any) => (
                          <option key={tap.id} value={tap.name}>
                            {tap.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {hasActiveFilters && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        {filteredEvents.length} evento(s) encontrado(s)
                      </p>
                      <Button variant="outline" onClick={clearFilters}>
                        Limpar filtros
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Tabela de Eventos */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Carregando eventos...</div>
            </div>
          ) : sortedEvents.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">
                Nenhum evento encontrado para os filtros selecionados.
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50" 
                    onClick={() => handleSort("datetime")}
                  >
                    <div className="flex items-center gap-1">
                      Data/Hora
                      {sortColumn === "datetime" && (
                        sortDirection === "asc" ? 
                        <ChevronUp className="h-3 w-3" /> : 
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50" 
                    onClick={() => handleSort("tapName")}
                  >
                    <div className="flex items-center gap-1">
                      Torneira
                      {sortColumn === "tapName" && (
                        sortDirection === "asc" ? 
                        <ChevronUp className="h-3 w-3" /> : 
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50" 
                    onClick={() => handleSort("posName")}
                  >
                    <div className="flex items-center gap-1">
                      Local
                      {sortColumn === "posName" && (
                        sortDirection === "asc" ? 
                        <ChevronUp className="h-3 w-3" /> : 
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Estilo</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Dispositivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEvents.map((event: TimelineEvent) => {
                  const { date, time } = formatEventDateTime(event.datetime);
                  return (
                    <TableRow key={`${event.type}-${event.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                            event.type === 'pour' 
                              ? 'bg-orange-100 text-orange-600' 
                              : 'bg-green-100 text-green-600'
                          }`}>
                            {getEventIcon(event.type)}
                          </div>
                          <Badge variant={event.type === 'pour' ? 'default' : 'secondary'}>
                            {event.type === "pour" ? "Consumo" : "Troca"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{date}</div>
                          <div className="text-sm text-muted-foreground">{time}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{event.tapName}</TableCell>
                      <TableCell>{event.posName}</TableCell>
                      <TableCell>{event.beerStyleName || "-"}</TableCell>
                      <TableCell>
                        {event.totalVolumeMl ? `${event.totalVolumeMl}ml` : "-"}
                      </TableCell>
                      <TableCell>{event.deviceCode || "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function History() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="historico" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="torneiras" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Torneiras
          </TabsTrigger>
          <TabsTrigger value="pontos-venda" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Pontos de venda
          </TabsTrigger>
          <TabsTrigger value="estilos" className="flex items-center gap-2">
            <Beer className="h-4 w-4" />
            Estilos de chopes
          </TabsTrigger>
          <TabsTrigger value="dispositivos" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Dispositivos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="historico" className="space-y-6">
          <HistoryTimeline />
        </TabsContent>

        <TabsContent value="torneiras" className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Torneiras</h1>
          </div>
          <TapsManagement />
        </TabsContent>

        <TabsContent value="pontos-venda" className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Pontos de Venda</h1>
          </div>
          <POSManagement />
        </TabsContent>

        <TabsContent value="estilos" className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Estilos de Chopes</h1>
          </div>
          <BeerStylesManagement />
        </TabsContent>

        <TabsContent value="dispositivos" className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Dispositivos ESP32</h1>
          </div>
          <DevicesManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}