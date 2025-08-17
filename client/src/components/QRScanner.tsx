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
    <div className="fixed inset-0 bg-black">
      {/* Full Screen Camera */}
      <div className="w-full h-full relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* QR Code Detection Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-80 h-80 border-4 border-orange-400 rounded-3xl bg-transparent flex items-center justify-center">
            <div className="w-72 h-72 border-2 border-orange-300 rounded-2xl bg-transparent opacity-70"></div>
          </div>
        </div>
        
        {/* Scanning Animation */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-80 h-80 flex items-center justify-center">
            <div className="w-1 h-72 bg-orange-400 animate-pulse opacity-60"></div>
          </div>
        </div>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}