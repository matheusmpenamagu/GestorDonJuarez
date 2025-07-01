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
  const [selectedBeerStyle, setSelectedBeerStyle] = useState("");
  const [selectedPOS, setSelectedPOS] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Fetch data for filters
  const { data: taps = [] } = useQuery({ queryKey: ["/api/taps"] });
  const { data: pointsOfSale = [] } = useQuery({ queryKey: ["/api/points-of-sale"] });
  const { data: beerStyles = [] } = useQuery({ queryKey: ["/api/beer-styles"] });
  const { data: devices = [] } = useQuery({ queryKey: ["/api/devices"] });

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);
  if (selectedTap) queryParams.append("tapId", selectedTap);

  // Fetch timeline data
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/timeline", queryParams.toString()],
  });

  // Filter events by beer style, POS, and device on the frontend
  const filteredEvents = events.filter((event: TimelineEvent) => {
    if (selectedBeerStyle && event.beerStyleName !== selectedBeerStyle) return false;
    if (selectedPOS && event.posName !== selectedPOS) return false;
    if (selectedDevice && event.deviceCode !== selectedDevice) return false;
    return true;
  });

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedTap("");
    setSelectedBeerStyle("");
    setSelectedPOS("");
    setSelectedDevice("");
  };

  const hasActiveFilters = startDate || endDate || selectedTap || selectedBeerStyle || selectedPOS || selectedDevice;

  const getEventIcon = (type: string) => {
    return type === "pour" ? <Beer className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />;
  };

  const getEventColor = (type: string) => {
    return type === "pour" ? "text-orange-600" : "text-green-600";
  };

  const formatEventDateTime = (datetime: string) => {
    try {
      let date: Date;
      
      if (datetime.includes('T')) {
        // ISO format
        date = parseISO(datetime);
      } else {
        // Assume it's in "DD/MM/YYYY HH:MM:SS" format and convert it
        const [datePart, timePart] = datetime.split(' ');
        const [day, month, year] = datePart.split('/');
        const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart || '00:00:00'}`;
        date = parseISO(isoString);
      }
      
      if (isNaN(date.getTime())) {
        return { date: 'Data inválida', time: 'Hora inválida' };
      }
      
      return {
        date: format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
        time: format(date, "HH:mm", { locale: ptBR })
      };
    } catch (error) {
      console.error('Error formatting date:', error);
      return { date: 'Data inválida', time: 'Hora inválida' };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Timeline de eventos</h2>
        <p className="text-muted-foreground">
          Timeline de consumo e trocas de barril
        </p>
      </div>

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center justify-between w-full p-0 h-auto">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  <CardTitle className="text-left">Filtros</CardTitle>
                </div>
                {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CardDescription>
              Filtre o histórico por período, torneira, estilo, local e dispositivo
            </CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={selectedTap}
                    onChange={(e) => setSelectedTap(e.target.value)}
                  >
                    <option value="">Todas as torneiras</option>
                    {taps.map((tap: any) => (
                      <option key={tap.id} value={tap.id}>
                        {tap.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beer-style-filter">Estilo de Chope</Label>
                  <select
                    id="beer-style-filter"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={selectedBeerStyle}
                    onChange={(e) => setSelectedBeerStyle(e.target.value)}
                  >
                    <option value="">Todos os estilos</option>
                    {beerStyles.map((style: any) => (
                      <option key={style.id} value={style.name}>
                        {style.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pos-filter">Ponto de Venda</Label>
                  <select
                    id="pos-filter"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={selectedPOS}
                    onChange={(e) => setSelectedPOS(e.target.value)}
                  >
                    <option value="">Todos os locais</option>
                    {pointsOfSale.map((pos: any) => (
                      <option key={pos.id} value={pos.name}>
                        {pos.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-filter">Dispositivo</Label>
                  <select
                    id="device-filter"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                  >
                    <option value="">Todos os dispositivos</option>
                    {devices.map((device: any) => (
                      <option key={device.id} value={device.code}>
                        {device.code} - {device.name}
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
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Carregando eventos...</div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">
                Nenhum evento encontrado para os filtros selecionados.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Tipo</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Torneira</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Estilo</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Dispositivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event: TimelineEvent) => {
                    const { date, time } = formatEventDateTime(event.datetime);
                    return (
                      <TableRow key={`${event.type}-${event.id}`}>
                        <TableCell>
                          <div className={`flex items-center gap-2 ${getEventColor(event.type)}`}>
                            {getEventIcon(event.type)}
                            <Badge variant={event.type === "pour" ? "default" : "secondary"}>
                              {event.type === "pour" ? "Consumo" : "Troca"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{date}</span>
                            <span className="text-sm text-muted-foreground">{time}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{event.tapName}</TableCell>
                        <TableCell>{event.posName}</TableCell>
                        <TableCell>{event.beerStyleName || "-"}</TableCell>
                        <TableCell>
                          {event.totalVolumeMl ? `${(event.totalVolumeMl / 1000).toFixed(2)}L` : "-"}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{event.deviceCode || "-"}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function History() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consumo de chopes</h1>
        <p className="text-muted-foreground">
          Gestão completa do sistema de chopes
        </p>
      </div>

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
          <TapsManagement />
        </TabsContent>

        <TabsContent value="pontos-venda" className="space-y-6">
          <POSManagement />
        </TabsContent>

        <TabsContent value="estilos" className="space-y-6">
          <BeerStylesManagement />
        </TabsContent>

        <TabsContent value="dispositivos" className="space-y-6">
          <DevicesManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}