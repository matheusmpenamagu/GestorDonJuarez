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
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
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
            </div>
          </CollapsibleContent>
        </div>
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
            <div className="space-y-3">
              {/* Cabeçalho da tabela */}
              <div className="flex items-center p-3 bg-gray-50 border rounded-lg font-medium text-sm text-gray-700">
                <div className="w-10 mr-4"></div> {/* Espaço para o ícone */}
                <div className="flex-1 min-w-0 mr-4">Tipo</div>
                <div className="flex-1 min-w-0 mr-4">Data/Hora</div>
                <div className="flex-1 min-w-0 mr-4">Torneira</div>
                <div className="flex-1 min-w-0 mr-4">Local</div>
                <div className="flex-1 min-w-0 mr-4">Estilo</div>
                <div className="flex-1 min-w-0 mr-4">Volume</div>
                <div className="flex-1 min-w-0">Dispositivo</div>
              </div>
              
              {filteredEvents.map((event: TimelineEvent) => {
                const { date, time } = formatEventDateTime(event.datetime);
                return (
                  <div key={`${event.type}-${event.id}`} className="flex items-center p-4 bg-white border rounded-lg shadow-sm">
                    {/* Ícone do tipo de evento */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full mr-4 ${
                      event.type === 'pour' 
                        ? 'bg-orange-100 text-orange-600' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {getEventIcon(event.type)}
                    </div>
                    
                    {/* Tipo */}
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="text-sm font-medium text-gray-900">
                        {event.type === "pour" ? "Consumo" : "Troca"}
                      </div>
                    </div>
                    
                    {/* Data/Hora */}
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="text-sm font-medium text-gray-900">{date}</div>
                      <div className="text-sm text-gray-500">{time}</div>
                    </div>
                    
                    {/* Torneira */}
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="text-sm font-medium text-gray-900">{event.tapName}</div>
                    </div>
                    
                    {/* Local */}
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="text-sm text-gray-900">{event.posName}</div>
                    </div>
                    
                    {/* Estilo */}
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="text-sm text-gray-900">{event.beerStyleName || "-"}</div>
                    </div>
                    
                    {/* Volume */}
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="text-sm font-medium text-gray-900">
                        {event.totalVolumeMl ? `${event.totalVolumeMl} ml` : "-"}
                      </div>
                    </div>
                    
                    {/* Dispositivo */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono text-gray-900">
                        {event.deviceCode || "-"}
                      </div>
                    </div>
                  </div>
                );
              })}
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