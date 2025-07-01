import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Filter, Beer, RefreshCw, Clock, ChevronDown, ChevronUp } from "lucide-react";
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
  const [selectedBeerStyle, setSelectedBeerStyle] = useState("");
  const [selectedPOS, setSelectedPOS] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  // Get filter options
  const { data: taps = [] } = useQuery({
    queryKey: ["/api/taps"],
  });

  const { data: beerStyles = [] } = useQuery({
    queryKey: ["/api/beer-styles"],
  });

  const { data: pointsOfSale = [] } = useQuery({
    queryKey: ["/api/points-of-sale"],
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["/api/devices"],
  });

  // Combine and sort events
  const allEvents: TimelineEvent[] = [
    ...(Array.isArray(pourEvents) ? pourEvents : []).map((event: any) => ({
      id: event.id,
      type: "pour" as const,
      datetime: event.datetime,
      tapName: event.tapName,
      posName: event.posName,
      beerStyleName: event.beerStyleName,
      totalVolumeMl: event.totalVolumeMl,
      deviceCode: event.deviceCode,
    })),
    ...(Array.isArray(kegChangeEvents) ? kegChangeEvents : []).map(
      (event: any) => ({
        id: event.id,
        type: "keg_change" as const,
        datetime: event.datetime,
        tapName: event.tap?.name || `Torneira ${event.tapId}`,
        posName: event.tap?.pointOfSale?.name || 'Local não especificado',
        beerStyleName: undefined,
        totalVolumeMl: undefined,
        deviceCode: undefined,
      }),
    ),
  ].sort((a, b) => {
    // Safe date parsing for sorting
    const parseDate = (datetime: string) => {
      if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(datetime)) {
        const [datePart, timePart] = datetime.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
      }
      return new Date(datetime);
    };
    
    const dateA = parseDate(a.datetime);
    const dateB = parseDate(b.datetime);
    
    return dateB.getTime() - dateA.getTime();
  });

  // Apply client-side filters
  const filteredEvents = allEvents.filter(event => {
    // Filter by beer style
    if (selectedBeerStyle && event.beerStyleName !== selectedBeerStyle) {
      return false;
    }
    
    // Filter by point of sale
    if (selectedPOS && event.posName !== selectedPOS) {
      return false;
    }
    
    // Filter by device
    if (selectedDevice && event.deviceCode !== selectedDevice) {
      return false;
    }
    
    return true;
  });

  const isLoading = isLoadingPours || isLoadingKegs;



  const getEventIcon = (type: string) => {
    return type === "pour" ? Beer : RefreshCw;
  };

  const getEventBgColor = (type: string) => {
    return type === "pour" ? "bg-primary" : "bg-green-600";
  };

  const formatDateTime = (datetime: string) => {
    try {
      // Check if datetime is already in Brazilian format "dd/MM/yyyy HH:mm:ss"
      if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(datetime)) {
        // Parse Brazilian format manually
        const [datePart, timePart] = datetime.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');
        
        const date = new Date(
          parseInt(year), 
          parseInt(month) - 1, // Month is 0-indexed
          parseInt(day), 
          parseInt(hour), 
          parseInt(minute), 
          parseInt(second)
        );
        
        if (isNaN(date.getTime())) {
          return { date: 'Data inválida', time: 'Hora inválida' };
        }
        
        return {
          date: format(date, "dd/MM/yyyy", { locale: ptBR }),
          time: format(date, "HH:mm:ss", { locale: ptBR })
        };
      }
      
      // Try other formats
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
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={selectedTap}
                    onChange={(e) => setSelectedTap(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {(Array.isArray(taps) ? taps : []).map((tap: any) => (
                      <option key={tap.id} value={tap.id}>
                        {tap.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beer-style-filter">Estilo</Label>
                  <select
                    id="beer-style-filter"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={selectedBeerStyle}
                    onChange={(e) => setSelectedBeerStyle(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {(Array.isArray(beerStyles) ? beerStyles : []).map((style: any) => (
                      <option key={style.id} value={style.name}>
                        {style.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pos-filter">Local</Label>
                  <select
                    id="pos-filter"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={selectedPOS}
                    onChange={(e) => setSelectedPOS(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {(Array.isArray(pointsOfSale) ? pointsOfSale : []).map((pos: any) => (
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
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {(Array.isArray(devices) ? devices : []).map((device: any) => (
                      <option key={device.id} value={device.code}>
                        {device.code} - {device.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Atividades
          </CardTitle>
          <CardDescription>
            {filteredEvents.length} evento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando histórico...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhum evento encontrado para os filtros selecionados
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Tipo</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Torneira</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Estilo</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Dispositivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => {
                    const Icon = getEventIcon(event.type);
                    const { date, time } = formatDateTime(event.datetime);
                    
                    return (
                      <TableRow key={`${event.type}-${event.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-full ${getEventBgColor(event.type)} text-white`}>
                              <Icon className="h-3 w-3" />
                            </div>
                            <span className="text-xs font-medium">
                              {event.type === "pour" ? "Consumo" : "Troca"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <div>
                            <div className="font-medium">{date}</div>
                            <div className="text-xs text-muted-foreground">{time}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {event.tapName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {event.posName}
                        </TableCell>
                        <TableCell className="text-sm">
                          {event.beerStyleName || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {event.type === "pour" && event.totalVolumeMl
                            ? `${event.totalVolumeMl.toLocaleString()} ml`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {event.deviceCode ? (
                            <Badge variant="secondary" className="text-xs">
                              {event.deviceCode}
                            </Badge>
                          ) : (
                            "-"
                          )}
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
