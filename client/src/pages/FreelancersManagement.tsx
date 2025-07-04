import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Clock, Calendar, Phone, MapPin, User, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FreelancerTimeEntry {
  id: number;
  employeeId: number | null;
  freelancerPhone: string | null;
  freelancerName: string | null;
  unitId: number | null;
  entryType: 'entrada' | 'saida';
  timestamp: string;
  message: string | null;
  isManualEntry: boolean | null;
  notes: string | null;
  unit?: Unit;
}

interface FreelancerStats {
  freelancerPhone: string;
  freelancerName: string | null;
  totalHours: number;
  totalDays: number;
  entries: FreelancerTimeEntry[];
  isManualEntry: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  unit?: {
    id: number;
    name: string;
  };
}

interface FreelancerStats {
  freelancerPhone: string;
  freelancerName: string | null;
  totalHours: number;
  totalDays: number;
  entries: FreelancerTimeEntry[];
}

interface Unit {
  id: number;
  name: string;
}

export default function FreelancersManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FreelancerTimeEntry | null>(null);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  // Fetch freelancer statistics
  const { data: statsResponse, isLoading: statsLoading } = useQuery<{
    period: { start: string; end: string };
    freelancers: FreelancerStats[];
  }>({
    queryKey: ['/api/freelancer-stats', dateRange.start, dateRange.end],
    enabled: !!dateRange.start && !!dateRange.end,
  });
  
  const statsData = statsResponse?.freelancers || [];

  // Fetch time entries
  const { data: entries = [], isLoading: entriesLoading } = useQuery<FreelancerTimeEntry[]>({
    queryKey: ['/api/freelancer-entries', dateRange.start, dateRange.end],
    enabled: !!dateRange.start && !!dateRange.end,
  });

  // Fetch units
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['/api/units'],
  });

  // Fetch freelancer employees
  const { data: allEmployees = [] } = useQuery({
    queryKey: ['/api/employees'],
  });

  // Filter only freelancer employees
  const freelancerEmployees = (allEmployees as any[]).filter((emp: any) => 
    emp.role?.name === 'Freelancer' || emp.employmentType === 'Freelancer'
  );

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/freelancer-entries', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer-stats'] });
      setIsDialogOpen(false);
      setEditingEntry(null);
      toast({ title: "Sucesso", description: "Registro de ponto criado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao criar registro de ponto", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest('PUT', `/api/freelancer-entries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer-stats'] });
      setIsDialogOpen(false);
      setEditingEntry(null);
      toast({ title: "Sucesso", description: "Registro de ponto atualizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao atualizar registro de ponto", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/freelancer-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer-stats'] });
      toast({ title: "Sucesso", description: "Registro de ponto excluído com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao excluir registro de ponto", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const employeeId = formData.get('employeeId') as string;
    const unitIdValue = formData.get('unitId') as string;
    
    // Find selected employee to get their details
    const selectedEmployee = freelancerEmployees.find((emp: any) => emp.id.toString() === employeeId);
    
    const data = {
      employeeId: employeeId ? parseInt(employeeId) : null,
      freelancerPhone: selectedEmployee?.whatsapp || null,
      freelancerName: selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : null,
      unitId: unitIdValue && unitIdValue !== 'none' ? parseInt(unitIdValue) : null,
      entryType: formData.get('entryType') as string,
      timestamp: `${formData.get('date')}T${formData.get('time')}:00.000Z`,
      message: formData.get('message') as string,
      notes: formData.get('notes') as string,
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return 'Não informado';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatTimestamp = (timestamp: string | null | undefined) => {
    try {
      if (!timestamp) {
        console.log("Timestamp is null/undefined:", timestamp);
        return 'Data inválida';
      }
      
      console.log("Formatting timestamp:", timestamp, typeof timestamp);
      const date = new Date(timestamp);
      console.log("Date object:", date, "isValid:", !isNaN(date.getTime()));
      
      if (isNaN(date.getTime())) return 'Data inválida';
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch (error) {
      console.log("Error formatting timestamp:", error);
      return 'Data inválida';
    }
  };

  const getDateTimeDefaults = (timestamp: string | null | undefined) => {
    try {
      if (!timestamp) {
        return {
          date: format(new Date(), 'yyyy-MM-dd'),
          time: '08:00'
        };
      }
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return {
          date: format(new Date(), 'yyyy-MM-dd'),
          time: '08:00'
        };
      }
      return {
        date: timestamp.split('T')[0],
        time: timestamp.split('T')[1].substring(0, 5)
      };
    } catch {
      return {
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '08:00'
      };
    }
  };

  const formatHours = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
  };

  const getEntryTypeColor = (type: string) => {
    return type === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const totalFreelancers = statsData?.length || 0;
  const totalHours = statsData?.reduce((sum: number, f: FreelancerStats) => sum + f.totalHours, 0) || 0;
  const totalDays = statsData?.reduce((sum: number, f: FreelancerStats) => sum + f.totalDays, 0) || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Freelancers</h1>
          <p className="text-gray-600">Controle de ponto e horas trabalhadas</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingEntry(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? 'Editar Registro de Ponto' : 'Novo Registro de Ponto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="employeeId">Freelancer *</Label>
                <Select name="employeeId" defaultValue={editingEntry?.employeeId?.toString() || ''} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar freelancer" />
                  </SelectTrigger>
                  <SelectContent>
                    {freelancerEmployees?.map((employee: any) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.firstName} {employee.lastName} - {employee.whatsapp ? formatPhoneNumber(employee.whatsapp) : 'Sem telefone'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unitId">Unidade</Label>
                  <Select name="unitId" defaultValue={editingEntry?.unitId?.toString() || 'none'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma unidade</SelectItem>
                      {(units as Unit[])?.map((unit: Unit) => (
                        <SelectItem key={unit.id} value={unit.id.toString()}>
                          {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="entryType">Tipo de Entrada *</Label>
                  <Select name="entryType" defaultValue={editingEntry?.entryType || ''} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de entrada" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    defaultValue={getDateTimeDefaults(editingEntry?.timestamp).date}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="time">Horário *</Label>
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    defaultValue={getDateTimeDefaults(editingEntry?.timestamp).time}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="message">Mensagem</Label>
                <Input
                  id="message"
                  name="message"
                  placeholder="Ex: Cheguei, Fui"
                  defaultValue={editingEntry?.message || ''}
                />
              </div>

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Observações adicionais"
                  defaultValue={editingEntry?.notes || ''}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingEntry ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros de Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtro de Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Freelancers</p>
                <p className="text-2xl font-bold text-gray-900">{totalFreelancers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Horas</p>
                <p className="text-2xl font-bold text-gray-900">{formatHours(totalHours)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Timer className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Dias Trabalhados</p>
                <p className="text-2xl font-bold text-gray-900">{totalDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo por Freelancer */}
      {statsData && statsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo por Freelancer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statsData.map((freelancer: FreelancerStats) => (
                <div key={freelancer.freelancerPhone} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        {freelancer.freelancerName || 'Nome não informado'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatPhoneNumber(freelancer.freelancerPhone)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-600">
                        {freelancer.totalDays} dias
                      </span>
                      <span className="font-medium text-orange-600">
                        {formatHours(freelancer.totalHours)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Registros */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Ponto</CardTitle>
        </CardHeader>
        <CardContent>
          {entriesLoading ? (
            <div className="text-center py-4">Carregando registros...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Freelancer</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Manual</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-gray-500">
                      Nenhum registro encontrado no período
                    </TableCell>
                  </TableRow>
                ) : (
                  entries?.map((entry: FreelancerTimeEntry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {formatTimestamp(entry.timestamp)}
                      </TableCell>
                      <TableCell>{entry.freelancerName || 'Não informado'}</TableCell>
                      <TableCell>{formatPhoneNumber(entry.freelancerPhone)}</TableCell>
                      <TableCell>
                        <Badge className={getEntryTypeColor(entry.entryType)}>
                          {entry.entryType === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell>{entry.unit?.name || '-'}</TableCell>
                      <TableCell>{entry.message}</TableCell>
                      <TableCell>
                        {entry.isManualEntry && (
                          <Badge variant="secondary">Manual</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingEntry(entry);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Tem certeza que deseja excluir este registro?')) {
                                deleteMutation.mutate(entry.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}