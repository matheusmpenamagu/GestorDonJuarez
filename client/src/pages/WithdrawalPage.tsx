import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { QRScanner } from '@/components/QRScanner';
import { CheckCircle, Package, User, Calendar, LogOut, ArrowLeft, Loader2 } from 'lucide-react';
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

  // Debug logging
  console.log('🔍 [DEBUG] WithdrawalPage render - pinState:', pinState, 'scanState:', scanState, 'sessionId:', sessionId);

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
      console.log('📱 [PIN-AUTH] Setting states - pinState: authenticated, scanState: scanning');
      setSessionId(data.sessionId);
      setPinState('authenticated');
      setScanState('scanning');
      toast({ 
        title: "Autenticado com sucesso!",
        description: `Bem-vindo, ${data.firstName}!`,
      });
      
      // Debug log current states after setting
      setTimeout(() => {
        console.log('📱 [PIN-AUTH] States after update - pinState:', pinState, 'scanState:', scanState);
      }, 100);
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

  // PIN handlers
  const handlePinEntry = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handlePinBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handlePinSubmit = () => {
    if (pin.length === 4) {
      pinLoginMutation.mutate(pin);
    }
  };

  const handleQRScanned = (data: string) => {
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

  // PIN Entry Screen - Exact copy from PublicLabelPage
  if (pinState === 'entry') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-orange-600">
              Sistema de Baixa de Etiquetas
            </CardTitle>
            <p className="text-gray-600">Digite seu PIN de 4 dígitos</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* PIN Display */}
            <div className="flex justify-center space-x-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center text-xl font-bold ${
                    pin.length > i
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {pin.length > i ? '●' : ''}
                </div>
              ))}
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <Button
                  key={num}
                  variant="outline"
                  size="lg"
                  className="h-16 text-xl font-semibold"
                  onClick={() => handlePinEntry(num.toString())}
                  disabled={pinLoginMutation.isPending}
                >
                  {num}
                </Button>
              ))}
              <Button
                variant="outline"
                size="lg"
                className="h-16 text-xl font-semibold"
                onClick={handlePinBackspace}
                disabled={pinLoginMutation.isPending || pin.length === 0}
              >
                ←
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-16 text-xl font-semibold"
                onClick={() => handlePinEntry('0')}
                disabled={pinLoginMutation.isPending}
              >
                0
              </Button>
              <Button
                size="lg"
                className="h-16 text-xl font-semibold bg-orange-600 hover:bg-orange-700"
                onClick={handlePinSubmit}
                disabled={pinLoginMutation.isPending || pin.length !== 4}
              >
                {pinLoginMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : '✓'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main scanning interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-orange-600 mb-4" style={{ fontFamily: 'Montserrat' }}>
            Don Juarez
          </h1>
          <p className="text-2xl text-orange-800 font-medium mb-6">
            Sistema de Baixa de Etiquetas
          </p>
          <Button 
            onClick={handleLogout}
            className="h-16 px-8 text-xl font-semibold bg-red-500 hover:bg-red-600 active:bg-red-700 rounded-2xl shadow-lg transform active:scale-[0.98] transition-all duration-200"
          >
            <LogOut className="h-6 w-6 mr-3" />
            Finalizar Sessão
          </Button>
        </div>

        {/* Scanner State: Scanning */}
        {scanState === 'scanning' && (
          <div className="space-y-8">
            <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    Scanner de QR Code
                  </h2>
                  <p className="text-xl text-gray-600">
                    Posicione o código QR da etiqueta dentro do quadrado
                  </p>
                </div>
                <QRScanner 
                  onQRScanned={handleQRScanned} 
                  isActive={true}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Scanner State: Found Label */}
        {scanState === 'found' && scannedLabel && (
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-12">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                  <Package className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-4xl font-bold text-gray-800 mb-2">
                  Etiqueta Encontrada
                </h2>
                <p className="text-xl text-gray-600">
                  Confirme os dados antes de dar baixa
                </p>
              </div>

              <div className="space-y-8">
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-8 rounded-3xl border border-orange-200">
                  <h3 className="text-2xl font-bold text-orange-800 mb-4">Produto</h3>
                  <p className="text-4xl font-bold text-gray-900 mb-3">
                    {scannedLabel.product?.name || 'Produto não identificado'}
                  </p>
                  {scannedLabel.product?.code && (
                    <p className="text-xl text-orange-700 font-medium">
                      Código: {scannedLabel.product.code}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-8 rounded-3xl border border-blue-200">
                    <h3 className="text-2xl font-bold text-blue-800 mb-4">Produção</h3>
                    <p className="text-3xl font-bold text-blue-900">{formatDate(scannedLabel.date)}</p>
                  </div>
                  <div className="bg-gradient-to-r from-red-50 to-red-100 p-8 rounded-3xl border border-red-200">
                    <h3 className="text-2xl font-bold text-red-800 mb-4">Validade</h3>
                    <p className="text-3xl font-bold text-red-900">{formatDate(scannedLabel.expiryDate)}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-8 rounded-3xl border border-gray-300 text-center">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Identificador</h3>
                  <p className="font-mono text-4xl font-bold tracking-widest text-gray-900 bg-white p-6 rounded-2xl border-4 border-gray-300 shadow-inner">
                    {scannedLabel.identifier}
                  </p>
                </div>

                <div className="flex flex-col gap-6 mt-12">
                  <Button 
                    onClick={handleConfirmWithdrawal}
                    disabled={withdrawalMutation.isPending}
                    className="w-full h-20 text-3xl font-bold bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-3xl shadow-xl transform active:scale-[0.98] transition-all duration-200"
                  >
                    {withdrawalMutation.isPending ? (
                      <div className="flex items-center gap-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-white"></div>
                        Processando Baixa...
                      </div>
                    ) : (
                      <>
                        <CheckCircle className="h-8 w-8 mr-4" />
                        CONFIRMAR BAIXA
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setScanState('scanning');
                      setScannedLabel(null);
                    }}
                    className="w-full h-16 text-2xl font-semibold border-4 border-gray-300 hover:border-gray-400 active:border-gray-500 rounded-3xl hover:bg-gray-50 active:bg-gray-100 shadow-lg transform active:scale-[0.98] transition-all duration-200"
                  >
                    <ArrowLeft className="h-6 w-6 mr-3" />
                    Voltar ao Scanner
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading states */}
        {(labelLookupMutation.isPending) && (
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-16 text-center">
              <div className="animate-spin rounded-full h-24 w-24 border-b-6 border-orange-600 mx-auto mb-8"></div>
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Buscando Etiqueta
              </h2>
              <p className="text-2xl text-gray-600">
                Processando código escaneado...
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}