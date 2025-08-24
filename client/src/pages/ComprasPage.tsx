import { useState } from 'react';
import { ShoppingCart, TrendingUp, TrendingDown, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Product {
  id: number;
  code: string;
  name: string;
  styleId: number | null;
  minStock: number | null;
  maxStock: number | null;
  unitOfMeasure: string;
}

interface StockData {
  productId: number;
  quantity: number;
}

function SugestaoComprasTab() {
  const [filter, setFilter] = useState<'all' | 'necessidade' | 'superavit'>('all');

  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: currentStock, isLoading: isLoadingStock } = useQuery<StockData[]>({
    queryKey: ["/api/products/current-stock"],
  });

  if (isLoadingProducts || isLoadingStock) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const stockMap = new Map(currentStock?.map(item => [item.productId, item.quantity]) || []);
  
  const productsWithStock = products?.map(product => {
    const currentQty = stockMap.get(product.id) || 0;
    const minStock = Number(product.minStock) || 0;
    const maxStock = Number(product.maxStock) || 0;
    const averageStock = minStock && maxStock ? (minStock + maxStock) / 2 : 0;
    const suggestionQty = averageStock > 0 ? Math.max(0, averageStock - currentQty) : 0;
    
    return {
      ...product,
      currentStock: currentQty,
      minStock,
      maxStock,
      suggestionQty,
      hasMinMax: minStock > 0 && maxStock > 0,
      inNeed: minStock > 0 && currentQty < minStock,
      inSurplus: maxStock > 0 && currentQty > maxStock,
    };
  }) || [];

  const filteredProducts = productsWithStock.filter(product => {
    if (!product.hasMinMax) return false;
    if (filter === 'necessidade') return product.inNeed;
    if (filter === 'superavit') return product.inSurplus;
    return true;
  });

  const stats = {
    total: productsWithStock.filter(p => p.hasMinMax).length,
    emNecessidade: productsWithStock.filter(p => p.inNeed).length,
    emSuperavit: productsWithStock.filter(p => p.inSurplus).length,
    adequado: productsWithStock.filter(p => p.hasMinMax && !p.inNeed && !p.inSurplus).length,
  };

  const formatNumber = (num: number): string => {
    return Number.isInteger(num) ? num.toString() : num.toFixed(3);
  };

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all duration-200 ${
            filter === 'necessidade' ? 'ring-2 ring-red-500 bg-red-50' : 'hover:shadow-md'
          }`}
          onClick={() => setFilter(filter === 'necessidade' ? 'all' : 'necessidade')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em necessidade</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.emNecessidade}</div>
            <p className="text-xs text-muted-foreground">
              produtos abaixo do mínimo
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-200 ${
            filter === 'superavit' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
          }`}
          onClick={() => setFilter(filter === 'superavit' ? 'all' : 'superavit')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em superávit</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.emSuperavit}</div>
            <p className="text-xs text-muted-foreground">
              produtos acima do máximo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adequado</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.adequado}</div>
            <p className="text-xs text-muted-foreground">
              produtos em nível ideal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              produtos configurados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          Todos
        </Button>
        <Button
          variant={filter === 'necessidade' ? 'default' : 'outline'}
          onClick={() => setFilter('necessidade')}
          size="sm"
          className="text-red-600 hover:text-red-700"
        >
          Em necessidade ({stats.emNecessidade})
        </Button>
        <Button
          variant={filter === 'superavit' ? 'default' : 'outline'}
          onClick={() => setFilter('superavit')}
          size="sm"
          className="text-blue-600 hover:text-blue-700"
        >
          Em superávit ({stats.emSuperavit})
        </Button>
      </div>

      {/* Tabela de Produtos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Sugestão de Compras
            {filter !== 'all' && (
              <span className="text-sm font-normal text-muted-foreground">
                ({filteredProducts.length} produtos filtrados)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum produto encontrado com os filtros aplicados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Código</th>
                    <th className="text-left py-2">Produto</th>
                    <th className="text-right py-2">Atual</th>
                    <th className="text-right py-2">Mín</th>
                    <th className="text-right py-2">Máx</th>
                    <th className="text-right py-2">Sugestão</th>
                    <th className="text-center py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-mono text-sm">{product.code}</td>
                      <td className="py-2 font-medium">{product.name}</td>
                      <td className="py-2 text-right">{formatNumber(product.currentStock)} {product.unitOfMeasure}</td>
                      <td className="py-2 text-right">{formatNumber(product.minStock)} {product.unitOfMeasure}</td>
                      <td className="py-2 text-right">{formatNumber(product.maxStock)} {product.unitOfMeasure}</td>
                      <td className="py-2 text-right font-semibold">
                        {product.suggestionQty > 0 ? `${formatNumber(product.suggestionQty)} ${product.unitOfMeasure}` : '-'}
                      </td>
                      <td className="py-2 text-center">
                        {product.inNeed && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                            <TrendingDown className="h-3 w-3" />
                            Necessidade
                          </span>
                        )}
                        {product.inSurplus && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            <TrendingUp className="h-3 w-3" />
                            Superávit
                          </span>
                        )}
                        {!product.inNeed && !product.inSurplus && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3" />
                            Adequado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ComprasPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          <ShoppingCart className="inline-block mr-3 h-8 w-8 text-orange-600" />
          Compras
        </h1>
        <p className="text-gray-600">
          Sistema de gestão de compras e análise de estoque
        </p>
      </div>

      <Tabs defaultValue="sugestao" className="w-full">
        <TabsList className="grid w-full grid-cols-1 max-w-md">
          <TabsTrigger value="sugestao" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Sugestão de compras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sugestao" className="mt-6">
          <SugestaoComprasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}