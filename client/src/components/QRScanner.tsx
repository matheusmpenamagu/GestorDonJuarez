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
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Permissão da Câmera Necessária</h3>
          <p className="text-muted-foreground mb-4">
            Para escanear códigos QR, precisamos acessar sua câmera.
          </p>
          <Button onClick={startCamera} className="w-full">
            Permitir Acesso à Câmera
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose} className="w-full mt-2">
              Cancelar
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <X className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Erro na Câmera</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={startCamera} className="w-full">
            Tentar Novamente
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose} className="w-full mt-2">
              Cancelar
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded-lg"
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
                <div className="w-48 h-48 border-2 border-primary rounded-lg bg-transparent relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-center text-muted-foreground mt-4">
            Aponte a câmera para o código QR da etiqueta
          </p>
          
          {onClose && (
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="w-full mt-4"
            >
              Cancelar
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}