import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';
// @ts-ignore - jsqr doesn't have types
import jsQR from 'jsqr';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose?: () => void;
  isActive?: boolean;
}

export function QRScanner({ onScan, onClose, isActive = true }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      console.log('📷 [QR-SCANNER] Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Usar câmera traseira quando disponível
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setHasPermission(true);
        startScanning();
        console.log('✅ [QR-SCANNER] Camera started successfully');
      }
    } catch (err) {
      console.error('❌ [QR-SCANNER] Error accessing camera:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    console.log('📷 [QR-SCANNER] Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const startScanning = () => {
    const scan = () => {
      if (!isActive || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(scan);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        console.log('✅ [QR-SCANNER] QR Code detected:', code.data);
        onScan(code.data);
        return; // Parar scanning após detectar um código
      }

      animationFrameRef.current = requestAnimationFrame(scan);
    };

    scan();
  };

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive]);

  if (!isActive) return null;

  if (hasPermission === false) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardContent className="p-12 text-center">
          <Camera className="h-20 w-20 mx-auto mb-8 text-orange-400" />
          <h3 className="text-3xl font-bold mb-6 text-gray-900">Permissão da Câmera Necessária</h3>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Para escanear códigos QR das etiquetas, precisamos acessar a câmera do seu dispositivo.
          </p>
          <div className="space-y-4">
            <Button 
              onClick={startCamera} 
              className="w-full text-xl py-6 bg-orange-600 hover:bg-orange-700 rounded-xl font-semibold"
              size="lg"
            >
              <Camera className="h-6 w-6 mr-3" />
              Permitir Acesso à Câmera
            </Button>
            {onClose && (
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="w-full text-xl py-6 border-2 rounded-xl font-semibold hover:bg-gray-50"
                size="lg"
              >
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardContent className="p-12 text-center">
          <X className="h-20 w-20 mx-auto mb-8 text-red-500" />
          <h3 className="text-3xl font-bold mb-6 text-red-700">Erro na Câmera</h3>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">{error}</p>
          <div className="space-y-4">
            <Button 
              onClick={startCamera} 
              className="w-full text-xl py-6 bg-orange-600 hover:bg-orange-700 rounded-xl font-semibold"
              size="lg"
            >
              Tentar Novamente
            </Button>
            {onClose && (
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="w-full text-xl py-6 border-2 rounded-xl font-semibold hover:bg-gray-50"
                size="lg"
              >
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardContent className="p-8">
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded-xl border-4 border-orange-200"
              playsInline
              muted
              autoPlay
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {/* Scanner overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="flex items-center justify-center h-full">
                <div className="w-64 h-64 border-4 border-orange-500 rounded-2xl bg-transparent relative animate-pulse">
                  <div className="absolute -top-1 -left-1 w-12 h-12 border-t-8 border-l-8 border-orange-500 rounded-tl-2xl"></div>
                  <div className="absolute -top-1 -right-1 w-12 h-12 border-t-8 border-r-8 border-orange-500 rounded-tr-2xl"></div>
                  <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-8 border-l-8 border-orange-500 rounded-bl-2xl"></div>
                  <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-8 border-r-8 border-orange-500 rounded-br-2xl"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8 space-y-3">
            <p className="text-2xl text-gray-700 font-semibold">
              Posicione o QR Code dentro do quadrado
            </p>
            <p className="text-lg text-muted-foreground">
              A leitura será automática quando detectado
            </p>
          </div>
          
          {onClose && (
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="w-full mt-8 text-xl py-6 border-2 rounded-xl font-semibold hover:bg-gray-50"
              size="lg"
            >
              Cancelar Scanner
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}