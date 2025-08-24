import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Search, 
  Eye, 
  Calendar,
  Package,
  User,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PurchaseWithRelations {
  id: number;
  purchaseDate: string;
  totalAmount: string;
  status: string;
  notes?: string;
  receivedAt?: string;
  receivingNotes?: string;
  responsible: {
    id: number;
    firstName: string;
    lastName: string;
  };
  supplier: {
    id: number;
    companyName: string;
    tradeName: string;
  };
  receivedBy?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  items: Array<{
    id: number;
    quantity: string;
    unitPrice: string;
    totalPrice: string;
    received: boolean;
    receivedQuantity?: string;
    notes?: string;
    product: {
      id: number;
      name: string;
      code: string;
      unitOfMeasure: string;
    };
  }>;
}

function formatNumber(value: string): string {
  const num = parseFloat(value);
  return Number.isInteger(num) ? num.toString() : num.toFixed(3);
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    pending: { 
      color: "bg-yellow-100 text-yellow-800", 
      icon: AlertCircle,
      label: "Pendente" 
    },
    received: { 
      color: "bg-green-100 text-green-800", 
      icon: CheckCircle,
      label: "Recebido" 
    },
    cancelled: { 
      color: "bg-red-100 text-red-800", 
      icon: XCircle,
      label: "Cancelado" 
    },
  };

  const variant = variants[status as keyof typeof variants] || variants.pending;
  const Icon = variant.icon;

  return (
    <Badge variant="secondary" className={variant.color}>
      <Icon className="w-3 h-3 mr-1" />
      {variant.label}
    </Badge>
  );
}

function PurchaseDetailsDialog({ purchase }: { purchase: PurchaseWithRelations }) {
  const [receivingNotes, setReceivingNotes] = useState("");
  const [itemsToReceive, setItemsToReceive] = useState<Record<number, { checked: boolean; quantity: string }>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const receivePurchaseMutation = useMutation({
    mutationFn: async (data: { receivingNotes: string; items: Array<{ id: number; receivedQuantity: string }> }) => {
      // First mark individual items as received
      for (const item of data.items) {
        await apiRequest("PUT", `/api/purchase-items/${item.id}/receive`, {
          receivedQuantity: item.receivedQuantity
        });
      }
      
      // Then mark the purchase as received
      const response = await apiRequest("POST", `/api/purchases/${purchase.id}/receive`, {
        receivingNotes: data.receivingNotes
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Entrada no estoque realizada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      setReceivingNotes("");
      setItemsToReceive({});
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || error?.message || "Erro desconhecido";
      toast({
        title: "Erro ao dar entrada no estoque",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleItemCheck = (itemId: number, checked: boolean) => {
    setItemsToReceive(prev => ({
      ...prev,
      [itemId]: {
        checked,
        quantity: checked ? (prev[itemId]?.quantity || "") : ""
      }
    }));
  };

  const handleQuantityChange = (itemId: number, quantity: string) => {
    setItemsToReceive(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity
      }
    }));
  };

  const handleReceiveItems = () => {
    const validItems = Object.entries(itemsToReceive)
      .filter(([_, data]) => data.checked && parseFloat(data.quantity) > 0)
      .map(([itemId, data]) => ({
        id: parseInt(itemId),
        receivedQuantity: data.quantity
      }));

    if (validItems.length === 0) {
      toast({
        title: "Selecione pelo menos um item",
        description: "Marque os itens recebidos e informe as quantidades",
        variant: "destructive",
      });
      return;
    }

    receivePurchaseMutation.mutate({
      receivingNotes,
      items: validItems
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Package className="w-4 h-4 mr-1" />
          Recebimento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" />
            Compra #{purchase.id}
          </DialogTitle>
          <DialogDescription>
            Detalhes completos da compra realizada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações gerais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(purchase.purchaseDate), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {purchase.responsible.firstName} {purchase.responsible.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{purchase.supplier.tradeName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <StatusBadge status={purchase.status} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Valores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total da Compra</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(parseFloat(purchase.totalAmount))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recebimento */}
          {purchase.status === "received" && purchase.receivedAt && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Informações de Recebimento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    Recebido em {format(new Date(purchase.receivedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {purchase.receivedBy && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      Por: {purchase.receivedBy.firstName} {purchase.receivedBy.lastName}
                    </span>
                  </div>
                )}
                {purchase.receivingNotes && (
                  <div className="mt-2">
                    <div className="text-sm font-medium mb-1">Observações do Recebimento:</div>
                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      {purchase.receivingNotes}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Itens */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Itens da Compra</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {purchase.items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Código: {item.product.code}
                        </div>
                      </div>
                      {item.received && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Recebido
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Quantidade</div>
                        <div className="font-medium">
                          {formatNumber(item.quantity)} {item.product.unitOfMeasure}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Valor Unitário</div>
                        <div className="font-medium">{formatCurrency(parseFloat(item.unitPrice))}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Total</div>
                        <div className="font-medium">{formatCurrency(parseFloat(item.totalPrice))}</div>
                      </div>
                      {item.received && item.receivedQuantity && (
                        <div>
                          <div className="text-muted-foreground">Qtd. Recebida</div>
                          <div className="font-medium">
                            {formatNumber(item.receivedQuantity)} {item.product.unitOfMeasure}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Seção de recebimento (apenas se a compra ainda não foi recebida) */}
                    {purchase.status !== "received" && (
                      <div className="border-t pt-3 bg-gray-50 -mx-3 px-3 pb-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`item-${item.id}`}
                              checked={itemsToReceive[item.id]?.checked || false}
                              onCheckedChange={(checked) => 
                                handleItemCheck(item.id, checked as boolean)
                              }
                            />
                            <Label htmlFor={`item-${item.id}`} className="text-sm font-medium">
                              Item recebido
                            </Label>
                          </div>
                          {itemsToReceive[item.id]?.checked && (
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Qtd. recebida:</Label>
                              <Input
                                type="number"
                                step="0.001"
                                placeholder="0.000"
                                value={itemsToReceive[item.id]?.quantity || ""}
                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                className="w-24"
                              />
                              <span className="text-sm text-muted-foreground">
                                {item.product.unitOfMeasure}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {item.notes && (
                      <div className="text-sm">
                        <div className="text-muted-foreground">Observações:</div>
                        <div className="text-muted-foreground bg-muted p-2 rounded mt-1">
                          {item.notes}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Observações gerais */}
          {purchase.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Observações da Compra</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {purchase.notes}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seção de recebimento (apenas se a compra ainda não foi recebida) */}
          {purchase.status !== "received" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Observações do Recebimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="receiving-notes" className="text-sm font-medium">
                    Observações (opcional)
                  </Label>
                  <Textarea
                    id="receiving-notes"
                    placeholder="Digite observações sobre o recebimento dos itens..."
                    value={receivingNotes}
                    onChange={(e) => setReceivingNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={handleReceiveItems}
                    disabled={receivePurchaseMutation.isPending}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {receivePurchaseMutation.isPending ? "Processando..." : "Dar entrada no estoque"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PurchaseHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");

  const { data: purchases, isLoading } = useQuery<PurchaseWithRelations[]>({
    queryKey: ["/api/purchases"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Filtrar e ordenar compras
  let filteredPurchases = purchases || [];

  // Filtro por texto
  if (searchTerm) {
    filteredPurchases = filteredPurchases.filter(purchase =>
      purchase.supplier.tradeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.responsible.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.responsible.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.id.toString().includes(searchTerm)
    );
  }

  // Filtro por status
  if (statusFilter !== "all") {
    filteredPurchases = filteredPurchases.filter(purchase => purchase.status === statusFilter);
  }

  // Ordenação
  filteredPurchases.sort((a, b) => {
    switch (sortBy) {
      case "date-desc":
        return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
      case "date-asc":
        return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
      case "value-desc":
        return parseFloat(b.totalAmount) - parseFloat(a.totalAmount);
      case "value-asc":
        return parseFloat(a.totalAmount) - parseFloat(b.totalAmount);
      default:
        return 0;
    }
  });

  const totalValue = filteredPurchases.reduce((sum, purchase) => 
    sum + parseFloat(purchase.totalAmount), 0
  );

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Compras</CardTitle>
          <CardDescription>
            Visualize e gerencie todas as compras registradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por fornecedor, responsável ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="received">Recebido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Data (mais recente)</SelectItem>
                <SelectItem value="date-asc">Data (mais antiga)</SelectItem>
                <SelectItem value="value-desc">Valor (maior)</SelectItem>
                <SelectItem value="value-asc">Valor (menor)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-sm text-muted-foreground">Total de Compras</div>
                <div className="text-2xl font-bold">{filteredPurchases.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-sm text-muted-foreground">Recebidas</div>
                <div className="text-2xl font-bold">
                  {filteredPurchases.filter(p => p.status === "received").length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-orange-500 rounded text-white flex items-center justify-center text-xs font-bold">
                R$
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Valor Total</div>
                <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {filteredPurchases.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "Nenhuma compra encontrada com os filtros aplicados"
                  : "Nenhuma compra registrada ainda"
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium">#{purchase.id}</TableCell>
                    <TableCell>
                      {format(new Date(purchase.purchaseDate), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{purchase.supplier.tradeName}</TableCell>
                    <TableCell>
                      {purchase.responsible.firstName} {purchase.responsible.lastName}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={purchase.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(parseFloat(purchase.totalAmount))}
                    </TableCell>
                    <TableCell className="text-center">
                      <PurchaseDetailsDialog purchase={purchase} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}