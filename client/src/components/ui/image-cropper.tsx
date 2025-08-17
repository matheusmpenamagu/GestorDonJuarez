import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  onCrop: (croppedImageUrl: string) => void;
  file: File | null;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export function ImageCropper({ isOpen, onClose, onCrop, file }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);

  const onSelectFile = useCallback((file: File) => {
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || ''),
      );
      reader.readAsDataURL(file);
    }
  }, []);

  // Carrega a imagem quando o arquivo é alterado
  React.useEffect(() => {
    if (file) {
      onSelectFile(file);
    }
  }, [file, onSelectFile]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1)); // Aspect ratio 1:1 para quadrado
  }

  const getCroppedImg = useCallback(() => {
    if (!completedCrop || !imgRef.current) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Define o tamanho do canvas como 100x100px
    canvas.width = 100;
    canvas.height = 100;

    // Calcula as proporções
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Desenha a imagem recortada e redimensionada
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      100,
      100,
    );

    canvas.toBlob((blob) => {
      if (blob) {
        const croppedImageUrl = URL.createObjectURL(blob);
        onCrop(croppedImageUrl);
        onClose();
      }
    }, 'image/jpeg', 0.9);
  }, [completedCrop, onCrop, onClose]);

  const handleCancel = () => {
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Recortar Logo da Unidade</DialogTitle>
        </DialogHeader>
        
        {imgSrc && (
          <div className="flex flex-col items-center space-y-4">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              minWidth={50}
              minHeight={50}
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imgSrc}
                style={{ transform: 'scale(1) rotate(0deg)' }}
                onLoad={onImageLoad}
                className="max-w-full h-auto"
              />
            </ReactCrop>
            
            <p className="text-sm text-muted-foreground text-center">
              Recorte a imagem em um formato quadrado. A logo será redimensionada para 100x100px.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={getCroppedImg}
            disabled={!completedCrop}
          >
            Recortar e Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}