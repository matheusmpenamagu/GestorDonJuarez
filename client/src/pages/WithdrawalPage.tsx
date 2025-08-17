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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-6 flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-4xl font-bold text-orange-600 mb-4">
              Don Juarez
            </CardTitle>
            <p className="text-xl text-muted-foreground">Sistema de Baixa de Etiquetas</p>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handlePinSubmit} className="space-y-8">
              <div className="space-y-4">
                <Label htmlFor="pin" className="text-2xl font-medium text-center block">
                  Digite seu PIN de Acesso
                </Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••••"
                  className="text-center text-4xl tracking-widest h-20 border-2 border-orange-200 focus:border-orange-500 rounded-xl"
                  maxLength={6}
                  autoFocus
                  disabled={pinLoginMutation.isPending}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full text-2xl py-8 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 rounded-2xl font-bold shadow-lg transform active:scale-[0.98] transition-all duration-150"
                disabled={pin.length < 4 || pinLoginMutation.isPending}
              >
                {pinLoginMutation.isPending ? (
                  <div className="flex items-center gap-4">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-3 border-white"></div>
                    Verificando PIN...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span>Entrar no Sistema</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main scanning interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-orange-600 mb-2">Baixa de Etiquetas</h1>
                <p className="text-lg text-muted-foreground">
                  Escaneie o QR code da etiqueta para dar baixa no estoque
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="flex items-center gap-3 text-lg px-8 py-6 border-3 border-red-300 hover:border-red-400 active:border-red-500 rounded-2xl font-semibold hover:bg-red-50 active:bg-red-100 shadow-md transform active:scale-[0.98] transition-all duration-150"
                size="lg"
              >
                <LogOut className="h-6 w-6" />
                Finalizar Sessão
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
          <Card className="shadow-lg">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-4 text-2xl">
                <Package className="h-8 w-8 text-orange-600" />
                Etiqueta Encontrada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 px-8 pb-8">
              <div className="grid grid-cols-1 gap-8">
                <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
                  <Label className="text-lg font-medium text-muted-foreground mb-2 block">Produto</Label>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {scannedLabel.product?.name || 'Produto não identificado'}
                  </p>
                  {scannedLabel.product?.code && (
                    <p className="text-lg text-muted-foreground">
                      Código: {scannedLabel.product.code}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                    <Label className="text-lg font-medium text-muted-foreground mb-2 block">Data de Produção</Label>
                    <p className="text-xl font-bold text-blue-900">{formatDate(scannedLabel.date)}</p>
                  </div>
                  <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                    <Label className="text-lg font-medium text-muted-foreground mb-2 block">Validade</Label>
                    <p className="text-xl font-bold text-red-900">{formatDate(scannedLabel.expiryDate)}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center">
                  <Label className="text-lg font-medium text-muted-foreground mb-3 block">Identificador da Etiqueta</Label>
                  <p className="font-mono text-3xl font-bold tracking-widest text-gray-900 bg-white p-4 rounded-lg border-2 border-gray-300">
                    {scannedLabel.identifier}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-6 mt-8">
                <Button 
                  onClick={handleConfirmWithdrawal}
                  disabled={withdrawalMutation.isPending}
                  className="w-full text-2xl py-8 bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-2xl font-bold shadow-lg transform active:scale-[0.98] transition-all duration-150"
                  size="lg"
                >
                  {withdrawalMutation.isPending ? (
                    <div className="flex items-center gap-4">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-3 border-white"></div>
                      Processando Baixa...
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="h-8 w-8 mr-4" />
                      Confirmar Baixa no Estoque
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setScanState('scanning');
                    setScannedLabel(null);
                  }}
                  className="w-full text-xl py-6 border-3 border-gray-300 hover:border-gray-400 active:border-gray-500 rounded-2xl font-semibold hover:bg-gray-50 active:bg-gray-100 shadow-md transform active:scale-[0.98] transition-all duration-150"
                  size="lg"
                >
                  <ArrowLeft className="h-6 w-6 mr-3" />
                  Voltar ao Scanner
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading states */}
        {(labelLookupMutation.isPending) && (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto mb-6"></div>
              <p className="text-2xl text-muted-foreground font-medium">
                Buscando etiqueta escaneada...
              </p>
              <p className="text-lg text-muted-foreground mt-2">
                Aguarde um momento
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}