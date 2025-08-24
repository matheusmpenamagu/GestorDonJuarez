import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PurchaseForm } from "@/components/purchases/PurchaseForm";

export default function NovaCompraPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation('/estoque/compras')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nova Compra</h1>
          <p className="text-muted-foreground">
            Registre uma nova compra de produtos
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Compra</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseForm onSuccess={() => setLocation('/estoque/compras')} />
        </CardContent>
      </Card>
    </div>
  );
}