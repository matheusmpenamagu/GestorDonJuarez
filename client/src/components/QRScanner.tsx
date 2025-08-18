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
  resetKey?: number; // Força reinicialização do scanner
}

export function QRScanner({ onQRScanned, onClose, isActive = true, resetKey = 0 }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const isScanningRef = useRef<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

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
        console.log('✅ [QR-SCANNER] Camera started successfully, starting scanning...');
        // Wait a bit for video to be ready, then start scanning
        setTimeout(() => {
          startScanning();
        }, 500);
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
    console.log('🔍 [QR-SCANNER] Starting scan loop...', { isActive, hasPermission });
    isScanningRef.current = true;
    setIsScanning(true);
    
    const scan = () => {
      if (!isActive || !videoRef.current || !canvasRef.current || !isScanningRef.current) {
        console.log('🔍 [QR-SCANNER] Scan conditions not met:', { 
          isActive, 
          hasVideo: !!videoRef.current, 
          hasCanvas: !!canvasRef.current, 
          isScanningRef: isScanningRef.current 
        });
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
        console.log('🔍 [QR-SCANNER] Video not ready:', { 
          hasContext: !!context, 
          readyState: video.readyState, 
          HAVE_ENOUGH_DATA: video.HAVE_ENOUGH_DATA 
        });
        animationFrameRef.current = requestAnimationFrame(scan);
        return;
      }

      // Log video dimensions and scanning status periodically
      if (Math.random() < 0.01) { // Log 1% of frames to avoid spam
        console.log('🔍 [QR-SCANNER] Video dimensions:', { 
          videoWidth: video.videoWidth, 
          videoHeight: video.videoHeight,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          isScanning: isScanning,
          imageDataLength: 'checking...'
        });
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Log occasionally for debugging
      if (Math.random() < 0.005) { // Very rare logging
        console.log('🔍 [QR-SCANNER] Image data:', { 
          imageDataLength: imageData.data.length,
          width: imageData.width,
          height: imageData.height,
          hasNonZeroPixels: imageData.data.some(pixel => pixel > 0)
        });
      }
      
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        console.log('✅ [QR-SCANNER] QR Code detected:', code.data);
        isScanningRef.current = false; // Parar temporariamente o scanning
        setIsScanning(false);
        onQRScanned(code.data);
        return; // Parar scanning após detectar um código
      }

      animationFrameRef.current = requestAnimationFrame(scan);
    };

    scan();
  };

  // Reiniciar scanning quando resetKey muda
  useEffect(() => {
    if (isActive && hasPermission && resetKey > 0) {
      console.log('🔄 [QR-SCANNER] Resetting scanner due to resetKey change:', resetKey);
      // Force reset scanning state
      isScanningRef.current = false;
      setIsScanning(false);
      setTimeout(() => {
        if (videoRef.current && canvasRef.current) {
          startScanning();
        }
      }, 200);
    }
  }, [resetKey]);

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
        
        {/* Scanning Status */}
        <div className="absolute top-8 left-0 right-0 flex flex-col items-center pointer-events-none">
          <div className="bg-black bg-opacity-60 rounded-2xl px-8 py-4 mb-4">
            <h2 className="text-white text-3xl font-bold text-center">Escaneie o QR Code</h2>
            <p className="text-orange-300 text-xl text-center mt-2">
              {isScanning ? 'Aguardando QR code...' : 'Scanner pausado'}
            </p>
          </div>
          {/* Scanning indicator */}
          {isScanning && (
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse delay-200"></div>
              <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse delay-400"></div>
            </div>
          )}
        </div>
        
        {/* Scanning Animation */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-80 h-80 flex items-center justify-center">
              <div className="w-1 h-72 bg-orange-400 animate-pulse opacity-60"></div>
            </div>
          </div>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}