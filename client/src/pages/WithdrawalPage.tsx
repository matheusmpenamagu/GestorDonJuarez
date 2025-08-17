import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { QRScanner } from '@/components/QRScanner';
import { CheckCircle, Package, User, Calendar, LogOut, ArrowLeft, Loader2, Tag } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PinState = 'entry' | 'authenticated';
type ScanState = 'scanning';

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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
        return;
      }
      
      setScannedLabel(label);
      setShowConfirmModal(true);
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
      setShowConfirmModal(false);
      setScannedLabel(null);
      
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

  const handleCancelConfirmation = () => {
    setShowConfirmModal(false);
    setScannedLabel(null);
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
    <div className="min-h-screen bg-black">
      <div className="w-full h-full">
        


        {/* Floating Logout Button - Only when authenticated */}
        {pinState === 'authenticated' && (
          <Button 
            onClick={handleLogout}
            className="fixed bottom-6 right-6 h-16 px-6 text-lg font-semibold bg-red-500 hover:bg-red-600 active:bg-red-700 rounded-full shadow-2xl transform active:scale-[0.95] transition-all duration-200 z-50"
          >
            Finalizar
          </Button>
        )}

        {/* Scanner State: Scanning - Ultra Minimal */}
        {scanState === 'scanning' && (
          <QRScanner 
            onQRScanned={handleQRScanned} 
            isActive={true}
          />
        )}

        {/* Confirmation Modal */}
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <Package className="h-8 w-8 text-orange-600" />
                Confirmar Baixa da Etiqueta
              </DialogTitle>
            </DialogHeader>
            
            {scannedLabel && (
              <div className="space-y-6 py-4">
                {/* Product Info */}
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-5 w-5 text-orange-600" />
                    <h3 className="font-semibold text-gray-800">Produto</h3>
                  </div>
                  <p className="text-lg font-medium text-gray-900">
                    {scannedLabel.product?.name || 'Nome não disponível'}
                  </p>
                  {scannedLabel.portion && (
                    <p className="text-gray-600">
                      Porção: {scannedLabel.portion.quantity} {scannedLabel.portion.unitOfMeasure}
                    </p>
                  )}
                </div>

                {/* Label Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">Identificador</span>
                    </div>
                    <p className="text-lg font-bold text-blue-800">{scannedLabel.identifier}</p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-600">Data de Produção</span>
                    </div>
                    <p className="text-lg font-semibold text-green-800">
                      {format(new Date(scannedLabel.date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-gray-600">Data de Validade</span>
                    </div>
                    <p className="text-lg font-semibold text-red-800">
                      {format(new Date(scannedLabel.expiryDate), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-4">
              <Button
                variant="outline"
                onClick={handleCancelConfirmation}
                className="h-14 px-8 text-lg font-semibold"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmWithdrawal}
                disabled={withdrawalMutation.isPending}
                className="h-14 px-8 text-lg font-semibold bg-green-600 hover:bg-green-700"
              >
                {withdrawalMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Confirmar Baixa
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


      </div>
    </div>
  );
}