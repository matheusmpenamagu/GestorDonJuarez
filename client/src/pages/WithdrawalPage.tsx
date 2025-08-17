import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { QRScanner } from '@/components/QRScanner';
import { CheckCircle, Package, User, Calendar, LogOut, ArrowLeft } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

type PinState = 'entry' | 'authenticated';
type ScanState = 'scanning' | 'found' | 'confirmed';

interface Label {
  id: number;
  productId: number;
  identifier: string;
  date: string;
  expiryDate: string;
  storageMethod: string;
  withdrawalDate?: string;
  withdrawalResponsibleId?: number;
  product?: {
    name: string;
    code: string;
  };
  portion?: {
    quantity: string;
    unitOfMeasure: string;
  };
  responsible?: {
    firstName: string;
    lastName: string;
  };
}

export default function WithdrawalPage() {
  const [pinState, setPinState] = useState<PinState>('entry');
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [pin, setPin] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scannedLabel, setScannedLabel] = useState<Label | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // PIN authentication mutation
  const pinLoginMutation = useMutation({
    mutationFn: async (pin: string) => {
      const response = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'PIN inválido');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('📱 [PIN-AUTH] Login successful:', data);
      setSessionId(data.sessionId);
      setPinState('authenticated');
      setScanState('scanning');
      toast({ 
        title: "Autenticado com sucesso!",
        description: `Bem-vindo, ${data.employee.firstName}!`,
      });
    },
    onError: (error) => {
      console.error('❌ [PIN-AUTH] Login failed:', error);
      toast({
        title: "Erro no PIN",
        description: error.message,
        variant: "destructive",
      });
      setPin('');
    }
  });

  // Label lookup mutation
  const labelLookupMutation = useMutation({
    mutationFn: async (identifier: string) => {
      if (!sessionId) throw new Error('Não autenticado');
      
      const response = await fetch(`/api/labels/qr/${identifier}`, {
        headers: {
          'Authorization': `Bearer ${sessionId}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.json();
    },
    onSuccess: (label: Label) => {
      console.log('🔍 [LABEL-LOOKUP] Found label:', label);
      
      if (label.withdrawalDate) {
        toast({
          title: "Etiqueta já processada",
          description: "Esta etiqueta já teve baixa realizada anteriormente.",
          variant: "destructive",
        });
        setScanState('scanning');
        return;
      }
      
      setScannedLabel(label);
      setScanState('found');
    },
    onError: (error) => {
      console.error('❌ [LABEL-LOOKUP] Error:', error);
      toast({
        title: "Etiqueta não encontrada",
        description: "Verifique se o código QR está correto e tente novamente.",
        variant: "destructive",
      });
      setScanState('scanning');
    }
  });

  // Withdrawal processing mutation
  const withdrawalMutation = useMutation({
    mutationFn: async (labelId: number) => {
      if (!sessionId) throw new Error('Não autenticado');
      
      const response = await fetch(`/api/labels/${labelId}/withdrawal`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      return response.json();
    },
    onSuccess: (updatedLabel: Label) => {
      console.log('✅ [WITHDRAWAL] Processed successfully:', updatedLabel);
      toast({
        title: "Baixa realizada!",
        description: "A etiqueta foi processada com sucesso.",
      });
      
      // Reset states to continue scanning
      setScannedLabel(null);
      setScanState('scanning');
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/labels'] });
    },
    onError: (error) => {
      console.error('❌ [WITHDRAWAL] Error:', error);
      toast({
        title: "Erro no processamento",
        description: "Não foi possível processar a baixa da etiqueta.",
        variant: "destructive",
      });
    }
  });

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      pinLoginMutation.mutate(pin);
    }
  };

  const handleQRScan = (data: string) => {
    console.log('📱 [QR-SCAN] Scanned data:', data);
    
    // Extrair o identificador do QR code
    let identifier = data;
    
    // Se for uma URL, extrair o identificador
    if (data.includes('/')) {
      const parts = data.split('/');
      identifier = parts[parts.length - 1];
    }
    
    labelLookupMutation.mutate(identifier);
  };

  const handleConfirmWithdrawal = () => {
    if (scannedLabel) {
      withdrawalMutation.mutate(scannedLabel.id);
    }
  };

  const handleLogout = () => {
    setSessionId(null);
    setPinState('entry');
    setScanState('scanning');
    setScannedLabel(null);
    setPin('');
    toast({ title: "Sessão encerrada" });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // PIN Entry Screen
  if (pinState === 'entry') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-orange-600">
              Don Juarez
            </CardTitle>
            <p className="text-muted-foreground">Sistema de Baixa de Etiquetas</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <Label htmlFor="pin" className="text-lg font-medium">
                  Digite seu PIN
                </Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="text-center text-2xl tracking-widest mt-2"
                  maxLength={6}
                  autoFocus
                  disabled={pinLoginMutation.isPending}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full text-lg py-6 bg-orange-600 hover:bg-orange-700"
                disabled={pin.length < 4 || pinLoginMutation.isPending}
              >
                {pinLoginMutation.isPending ? 'Verificando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main scanning interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        
        {/* Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-orange-600">Baixa de Etiquetas</h1>
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR code da etiqueta para dar baixa
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Finalizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Scanner State: Scanning */}
        {scanState === 'scanning' && (
          <QRScanner 
            onScan={handleQRScan} 
            isActive={true}
          />
        )}

        {/* Scanner State: Found Label */}
        {scanState === 'found' && scannedLabel && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Etiqueta Encontrada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Produto</Label>
                  <p className="text-lg font-semibold">
                    {scannedLabel.product?.name || 'Produto não identificado'}
                  </p>
                  {scannedLabel.product?.code && (
                    <p className="text-sm text-muted-foreground">
                      Código: {scannedLabel.product.code}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Data de Produção</Label>
                    <p className="font-medium">{formatDate(scannedLabel.date)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Validade</Label>
                    <p className="font-medium">{formatDate(scannedLabel.expiryDate)}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Identificador</Label>
                  <p className="font-mono text-lg font-bold tracking-wider">
                    {scannedLabel.identifier}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button 
                  onClick={handleConfirmWithdrawal}
                  disabled={withdrawalMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {withdrawalMutation.isPending ? 'Processando...' : 'Confirmar Baixa'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setScanState('scanning');
                    setScannedLabel(null);
                  }}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading states */}
        {(labelLookupMutation.isPending || withdrawalMutation.isPending) && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                {labelLookupMutation.isPending ? 'Buscando etiqueta...' : 'Processando baixa...'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}