import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';
// @ts-ignore - jsqr doesn't have types
import jsQR from 'jsqr';

interface QRScannerProps {
  onQRScanned: (data: string) => void;
  onClose?: () => void;
  isActive?: boolean;
}

export function QRScanner({ onQRScanned, onClose, isActive = true }: QRScannerProps) {
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
        onQRScanned(code.data);
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
      <div className="text-center space-y-8">
        <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-orange-100 mb-8">
          <Camera className="h-16 w-16 text-orange-600" />
        </div>
        <div className="space-y-4">
          <h3 className="text-4xl font-bold text-gray-800">Permissão da Câmera</h3>
          <p className="text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Para escanear códigos QR das etiquetas, precisamos acessar a câmera do seu dispositivo.
          </p>
        </div>
        <div className="space-y-6">
          <Button 
            onClick={startCamera} 
            className="h-20 px-12 text-3xl font-bold bg-orange-600 hover:bg-orange-700 active:bg-orange-800 rounded-3xl shadow-xl transform active:scale-[0.98] transition-all duration-200"
          >
            <Camera className="h-8 w-8 mr-4" />
            PERMITIR CÂMERA
          </Button>
          {onClose && (
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="h-16 px-8 text-2xl font-semibold border-4 border-gray-300 hover:border-gray-400 active:border-gray-500 rounded-3xl hover:bg-gray-50 active:bg-gray-100 shadow-lg transform active:scale-[0.98] transition-all duration-200"
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center space-y-8">
        <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-red-100 mb-8">
          <X className="h-16 w-16 text-red-600" />
        </div>
        <div className="space-y-4">
          <h3 className="text-4xl font-bold text-red-700">Erro na Câmera</h3>
          <p className="text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">{error}</p>
        </div>
        <div className="space-y-6">
          <Button 
            onClick={startCamera} 
            className="h-20 px-12 text-3xl font-bold bg-orange-600 hover:bg-orange-700 active:bg-orange-800 rounded-3xl shadow-xl transform active:scale-[0.98] transition-all duration-200"
          >
            TENTAR NOVAMENTE
          </Button>
          {onClose && (
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="h-16 px-8 text-2xl font-semibold border-4 border-gray-300 hover:border-gray-400 active:border-gray-500 rounded-3xl hover:bg-gray-50 active:bg-gray-100 shadow-lg transform active:scale-[0.98] transition-all duration-200"
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative max-w-3xl mx-auto">
        <video
          ref={videoRef}
          className="w-full h-auto rounded-3xl border-4 border-orange-300 shadow-2xl"
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
            <div className="w-80 h-80 border-6 border-orange-500 rounded-3xl bg-transparent relative animate-pulse shadow-2xl">
              <div className="absolute -top-2 -left-2 w-16 h-16 border-t-8 border-l-8 border-orange-600 rounded-tl-3xl"></div>
              <div className="absolute -top-2 -right-2 w-16 h-16 border-t-8 border-r-8 border-orange-600 rounded-tr-3xl"></div>
              <div className="absolute -bottom-2 -left-2 w-16 h-16 border-b-8 border-l-8 border-orange-600 rounded-bl-3xl"></div>
              <div className="absolute -bottom-2 -right-2 w-16 h-16 border-b-8 border-r-8 border-orange-600 rounded-br-3xl"></div>
              
              {/* Scanning animation line */}
              <div className="absolute inset-4 overflow-hidden rounded-2xl">
                <div className="w-full h-1 bg-orange-500 opacity-75 animate-bounce" style={{
                  animation: 'scanLine 2s linear infinite'
                }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-8 space-y-4">
        <p className="text-3xl text-gray-800 font-bold">
          Escaneie o QR Code da Etiqueta
        </p>
        <p className="text-xl text-gray-600 font-medium">
          Posicione o código dentro do quadrado laranja
        </p>
      </div>
      
      {onClose && (
        <div className="mt-8 text-center">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="h-16 px-12 text-2xl font-semibold border-4 border-gray-300 hover:border-gray-400 active:border-gray-500 rounded-3xl hover:bg-gray-50 active:bg-gray-100 shadow-lg transform active:scale-[0.98] transition-all duration-200"
          >
            Cancelar Scanner
          </Button>
        </div>
      )}
    </div>
  );
}