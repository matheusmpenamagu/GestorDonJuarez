import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { Product } from '@shared/schema';

type ProductWithStock = Product & {
  currentStock: number | null;
  stockCountDate: string | null;
  stockCountId: number | null;
};

type FilterType = 'all' | 'need' | 'surplus';

export default function PurchaseSuggestion() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof ProductWithStock>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: products = [], isLoading: productsLoading } = useQuery<ProductWithStock[]>({
    queryKey: ['/api/products']
  });

  const { data: currentStockData = [], isLoading: stockLoading } = useQuery<Array<{
    productId: number;
    quantity: string;
    stockCountDate: string;
    stockCountId: number;
  }>>({
    queryKey: ['/api/products/current-stock']
  });

  // Combina dados de produtos com estoque atual
  const productsWithStock = useMemo(() => {
    const stockMap = new Map(currentStockData.map(item => [item.productId, item]));
    
    return products
      .map(product => {
        const stockData = stockMap.get(product.id);
        return {
          ...product,
          currentStock: stockData ? parseFloat(stockData.quantity) : null,
          stockCountDate: stockData?.stockCountDate || null,
          stockCountId: stockData?.stockCountId || null,
        };
      })
      // Filtra apenas produtos com min/max cadastrados e que têm contagem de estoque
      .filter(product => 
        product.minStock !== null && 
        product.maxStock !== null && 
        product.currentStock !== null
      );
  }, [products, currentStockData]);

  // Cálculos para os cards
  const stats = useMemo(() => {
    const needProducts = productsWithStock.filter(p => 
      p.currentStock !== null && p.minStock !== null && p.currentStock < Number(p.minStock)
    );
    
    const surplusProducts = productsWithStock.filter(p => 
      p.currentStock !== null && p.maxStock !== null && p.currentStock > Number(p.maxStock)
    );

    return {
      needCount: needProducts.length,
      surplusCount: surplusProducts.length,
    };
  }, [productsWithStock]);

  // Filtragem e busca
  const filteredProducts = useMemo(() => {
    let filtered = productsWithStock;

    // Filtro por necessidade/superávit
    if (filter === 'need') {
      filtered = filtered.filter(p => 
        p.currentStock !== null && p.minStock !== null && p.currentStock < Number(p.minStock)
      );
    } else if (filter === 'surplus') {
      filtered = filtered.filter(p => 
        p.currentStock !== null && p.maxStock !== null && p.currentStock > Number(p.maxStock)
      );
    }

    // Busca por termo
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(term) ||
        product.code.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [productsWithStock, searchTerm, filter]);

  // Ordenação
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortField, sortDirection]);

  const handleSort = (field: keyof ProductWithStock) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof ProductWithStock) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const formatQuantity = (quantity: number | null) => {
    if (quantity === null || quantity === undefined) return '-';
    const num = Number(quantity);
    
    if (Number.isInteger(num)) {
      return num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  };

  const formatCurrency = (value: string | null) => {
    const numValue = value ? parseFloat(value) : 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const calculatePurchaseSuggestion = (product: ProductWithStock) => {
    if (!product.minStock || !product.maxStock || product.currentStock === null) return 0;
    
    const average = (Number(product.minStock) + Number(product.maxStock)) / 2;
    const suggestion = average - product.currentStock;
    
    return Math.max(0, suggestion); // Não retorna valores negativos
  };

  const getStockStatus = (product: ProductWithStock) => {
    if (product.currentStock === null || !product.minStock || !product.maxStock) return 'normal';
    
    if (product.currentStock < Number(product.minStock)) return 'need';
    if (product.currentStock > Number(product.maxStock)) return 'surplus';
    return 'normal';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'need': return 'bg-red-100 text-red-800';
      case 'surplus': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'need': return 'Necessário';
      case 'surplus': return 'Superávit';
      default: return 'Normal';
    }
  };

  if (productsLoading || stockLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Carregando sugestões de compra...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          <ShoppingCart className="inline-block mr-3 h-8 w-8 text-orange-600" />
          Sugestão de Compra
        </h1>
        <p className="text-gray-600">
          Análise de estoque e sugestões de compra baseadas em limites mínimos e máximos
        </p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${
            filter === 'need' ? 'ring-2 ring-red-500 bg-red-50' : ''
          }`}
          onClick={() => setFilter(filter === 'need' ? 'all' : 'need')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Necessidade</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.needCount}</div>
            <p className="text-xs text-gray-500">
              {stats.needCount === 1 ? 'produto abaixo' : 'produtos abaixo'} do mínimo
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${
            filter === 'surplus' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
          onClick={() => setFilter(filter === 'surplus' ? 'all' : 'surplus')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Superávit</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.surplusCount}</div>
            <p className="text-xs text-gray-500">
              {stats.surplusCount === 1 ? 'produto acima' : 'produtos acima'} do máximo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filtro ativo */}
      {filter !== 'all' && (
        <div className="mb-4">
          <Badge variant="outline" className="mr-2">
            Filtro ativo: {filter === 'need' ? 'Em necessidade' : 'Em superávit'}
          </Badge>
          <button 
            onClick={() => setFilter('all')}
            className="text-xs text-blue-600 hover:underline"
          >
            Limpar filtro
          </button>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('code')}
              >
                Código {getSortIcon('code')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                Nome {getSortIcon('name')}
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('currentStock')}
              >
                Estoque Atual {getSortIcon('currentStock')}
              </TableHead>
              <TableHead>Min/Máx</TableHead>
              <TableHead>Sugestão de Compra</TableHead>
              <TableHead>Un. Medida</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('currentValue')}
              >
                Valor Atual {getSortIcon('currentValue')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  {searchTerm || filter !== 'all' 
                    ? "Nenhum produto encontrado com os filtros aplicados." 
                    : "Nenhum produto com estoque min/máx e contagem disponível."
                  }
                </TableCell>
              </TableRow>
            ) : (
              sortedProducts.map((product) => {
                const suggestion = calculatePurchaseSuggestion(product);
                const status = getStockStatus(product);
                
                return (
                  <TableRow key={product.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">{product.code}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${getStockStatusColor(status)}`}>
                        {getStockStatusText(status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatQuantity(product.currentStock)}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-600">
                      {formatQuantity(Number(product.minStock))}/{formatQuantity(Number(product.maxStock))}
                    </TableCell>
                    <TableCell className="font-mono">
                      <span className={`font-medium ${
                        suggestion > 0 ? 'text-orange-600' : 'text-gray-400'
                      }`}>
                        {suggestion > 0 ? formatQuantity(suggestion) : '-'}
                      </span>
                    </TableCell>
                    <TableCell>{product.unitOfMeasure}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(product.currentValue)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {sortedProducts.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          Exibindo {sortedProducts.length} de {productsWithStock.length} produtos
        </div>
      )}
    </div>
  );
}