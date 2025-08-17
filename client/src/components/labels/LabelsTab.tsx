import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Calendar, QrCode, User, AlertTriangle, Clock, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LabelForm from "./LabelForm";

interface Product {
  id: number;
  name: string;
  category: string;
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
}

interface ProductPortion {
  id: number;
  productId: number;
  quantity: number;
  unitOfMeasure: string;
}

interface Label {
  id: number;
  productId: number;
  responsibleId: number;
  date: string;
  portionId: number;
  expiryDate: string;
  storageMethod: string;
  identifier: string;
  createdAt: string;
  updatedAt: string;
}

type FilterType = 'all' | 'expiring_today' | 'expiring_tomorrow' | 'expiring_week';

export default function LabelsTab() {
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: portions = [] } = useQuery<ProductPortion[]>({
    queryKey: ["/api/labels/portions"],
  });

  const { data: labels = [], isLoading } = useQuery<Label[]>({
    queryKey: ["/api/labels"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/labels/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId") || ""}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete label");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labels"] });
      toast({
        title: "Etiqueta excluída",
        description: "Etiqueta excluída com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir etiqueta",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (label: Label) => {
    setEditingLabel(label);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta etiqueta?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingLabel(null);
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || "Produto não encontrado";
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return "Funcionário não encontrado";
    return `${employee.firstName} ${employee.lastName}`;
  };

  const getPortion = (portionId: number) => {
    const portion = portions.find(p => p.id === portionId);
    if (!portion) return "Porção não encontrada";
    
    const unitDisplay = {
      'g': 'g',
      'kg': 'kg',
      'ml': 'ml',
      'l': 'l',
      'un': 'un',
      'fatias': 'fatias',
      'porções': 'porções'
    }[portion.unitOfMeasure] || portion.unitOfMeasure;
    
    return `${portion.quantity} ${unitDisplay}`;
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return expiry >= today && expiry <= tomorrow;
  };

  // Filter functions
  const isExpiringToday = (expiryDate: string) => {
    const expiry = startOfDay(new Date(expiryDate));
    const today = startOfDay(new Date());
    return expiry.getTime() <= today.getTime();
  };

  const isExpiringTomorrow = (expiryDate: string) => {
    const expiry = startOfDay(new Date(expiryDate));
    const tomorrow = startOfDay(addDays(new Date(), 1));
    return expiry.getTime() === tomorrow.getTime();
  };

  const isExpiringInWeek = (expiryDate: string) => {
    const expiry = startOfDay(new Date(expiryDate));
    const today = startOfDay(new Date());
    const weekFromNow = startOfDay(addDays(new Date(), 7));
    return expiry.getTime() > today.getTime() && expiry.getTime() <= weekFromNow.getTime();
  };

  // Count labels by category
  const expiringTodayCount = labels.filter(label => isExpiringToday(label.expiryDate)).length;
  const expiringTomorrowCount = labels.filter(label => isExpiringTomorrow(label.expiryDate)).length;
  const expiringWeekCount = labels.filter(label => isExpiringInWeek(label.expiryDate)).length;

  // Filter labels based on active filter
  const filteredLabels = labels.filter(label => {
    switch (activeFilter) {
      case 'expiring_today':
        return isExpiringToday(label.expiryDate);
      case 'expiring_tomorrow':
        return isExpiringTomorrow(label.expiryDate);
      case 'expiring_week':
        return isExpiringInWeek(label.expiryDate);
      default:
        return true;
    }
  });

  const getStorageMethodDisplay = (storageMethod: string) => {
    const methods = {
      'congelado': { icon: '🧊', label: 'Congelado' },
      'resfriado': { icon: '❄️', label: 'Resfriado' },
      'temperatura_ambiente': { icon: '🌡️', label: 'Ambiente' }
    };
    
    const method = methods[storageMethod as keyof typeof methods];
    return method ? { icon: method.icon, label: method.label } : { icon: '❓', label: 'Desconhecido' };
  };



  if (isLoading) {
    return <div>Carregando etiquetas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Etiquetas Geradas</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Visualize e gerencie todas as etiquetas criadas
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Gerar Etiqueta
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md border-l-4 border-l-red-500 ${
            activeFilter === 'expiring_today' ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950' : 'hover:bg-red-50 dark:hover:bg-red-950'
          }`}
          onClick={() => setActiveFilter(activeFilter === 'expiring_today' ? 'all' : 'expiring_today')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
              Vencendo Hoje
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">{expiringTodayCount}</div>
            <CardDescription className="text-red-600 dark:text-red-400">
              {expiringTodayCount === 1 ? 'etiqueta vencendo' : 'etiquetas vencendo'}
            </CardDescription>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md border-l-4 border-l-yellow-500 ${
            activeFilter === 'expiring_tomorrow' ? 'ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-950' : 'hover:bg-yellow-50 dark:hover:bg-yellow-950'
          }`}
          onClick={() => setActiveFilter(activeFilter === 'expiring_tomorrow' ? 'all' : 'expiring_tomorrow')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
              Vencendo Amanhã
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{expiringTomorrowCount}</div>
            <CardDescription className="text-yellow-600 dark:text-yellow-400">
              {expiringTomorrowCount === 1 ? 'etiqueta vencendo' : 'etiquetas vencendo'}
            </CardDescription>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md border-l-4 border-l-blue-500 ${
            activeFilter === 'expiring_week' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:bg-blue-50 dark:hover:bg-blue-950'
          }`}
          onClick={() => setActiveFilter(activeFilter === 'expiring_week' ? 'all' : 'expiring_week')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Vencendo em 7 Dias
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{expiringWeekCount}</div>
            <CardDescription className="text-blue-600 dark:text-blue-400">
              {expiringWeekCount === 1 ? 'etiqueta vencendo' : 'etiquetas vencendo'}
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Filter indicator */}
      {activeFilter !== 'all' && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            {activeFilter === 'expiring_today' && <AlertTriangle className="w-3 h-3 text-red-600" />}
            {activeFilter === 'expiring_tomorrow' && <Clock className="w-3 h-3 text-yellow-600" />}
            {activeFilter === 'expiring_week' && <CalendarDays className="w-3 h-3 text-blue-600" />}
            Filtro ativo: {
              activeFilter === 'expiring_today' ? 'Vencendo hoje' :
              activeFilter === 'expiring_tomorrow' ? 'Vencendo amanhã' :
              'Vencendo em 7 dias'
            }
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveFilter('all')}
            className="h-6 px-2 text-xs"
          >
            Limpar filtro
          </Button>
        </div>
      )}

      {/* Table */}
      {labels.length === 0 ? (
        <Alert>
          <AlertDescription>
            Nenhuma etiqueta gerada. Clique em "Gerar Etiqueta" para começar.
          </AlertDescription>
        </Alert>
      ) : filteredLabels.length === 0 ? (
        <Alert>
          <AlertDescription>
            Nenhuma etiqueta encontrada para o filtro selecionado.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identificador</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Porção</TableHead>
                <TableHead>Armazenamento</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Data Produção</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLabels.map((label) => (
                <TableRow key={label.id}>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <QrCode className="w-3 h-3" />
                      {label.identifier}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {getProductName(label.productId)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getPortion(label.portionId)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span>{getStorageMethodDisplay(label.storageMethod).icon}</span>
                      <span className="text-sm">{getStorageMethodDisplay(label.storageMethod).label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {getEmployeeName(label.responsibleId)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(label.date), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        isExpired(label.expiryDate) 
                          ? "destructive" 
                          : isExpiringSoon(label.expiryDate) 
                            ? "secondary" 
                            : "outline"
                      }
                      className="flex items-center gap-1 w-fit"
                    >
                      <Calendar className="w-3 h-3" />
                      {format(new Date(label.expiryDate), "dd/MM/yyyy", { locale: ptBR })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(label)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(label.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form Dialog */}
      <LabelForm
        open={showForm}
        onOpenChange={handleFormClose}
        label={editingLabel}
        products={products}
        portions={portions}
      />
    </div>
  );
}