import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon, Check } from "lucide-react";

export default function SettingsManagement() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/login-background', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Sucesso",
          description: "Imagem de fundo atualizada com sucesso!",
        });
        
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setUploadedImage(previewUrl);
        
        // Force reload of login page background
        const loginBgUrl = `/api/login-background?t=${Date.now()}`;
        const img = new Image();
        img.onload = () => {
          setUploadedImage(loginBgUrl);
        };
        img.src = loginBgUrl;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Erro no upload');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer upload da imagem",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configurações do Sistema</h2>
        <p className="text-muted-foreground mt-1">
          Configure a aparência e comportamento do sistema
        </p>
      </div>

      {/* Upload de Imagem de Fundo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Imagem de Fundo da Tela de Login
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="background-upload">Selecionar Nova Imagem</Label>
            <div className="mt-2">
              <Input
                id="background-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
            </p>
          </div>

          {isUploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
              Fazendo upload...
            </div>
          )}

          {uploadedImage && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                Imagem carregada com sucesso
              </div>
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={uploadedImage}
                  alt="Preview da imagem de fundo"
                  className="w-full h-48 object-cover"
                />
              </div>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Dica:</strong> Para ver a nova imagem de fundo, faça logout e volte à tela de login.
              A imagem será exibida como fundo da tela de autenticação.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Outras configurações podem ser adicionadas aqui */}
      <Card>
        <CardHeader>
          <CardTitle>Outras Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Configurações adicionais do sistema serão adicionadas aqui conforme necessário.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}