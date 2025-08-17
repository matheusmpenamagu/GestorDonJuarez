import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Building2, Upload, Image } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImageCropper } from "@/components/ui/image-cropper";
import { applyCnpjMask, isValidCnpjFormat } from "@/lib/cnpj-mask";

interface Unit {
  id: number;
  name: string;
  address: string;
  logoUrl?: string;
  cnpj?: string;
  createdAt: string;
  updatedAt: string;
}

interface UnitFormData {
  name: string;
  address: string;
  logoUrl?: string;
  cnpj?: string;
}

export default function UnitsManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState<UnitFormData>({
    name: "",
    address: "",
    logoUrl: "",
    cnpj: ""
  });
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["/api/units"],
  });

  const createUnitMutation = useMutation({
    mutationFn: async (data: UnitFormData) => {
      return await apiRequest("POST", "/api/units", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      resetForm();
      toast({
        title: "Sucesso",
        description: "Unidade criada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar unidade",
        variant: "destructive",
      });
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UnitFormData }) => {
      return await apiRequest("PUT", `/api/units/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      resetForm();
      toast({
        title: "Sucesso",
        description: "Unidade atualizada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar unidade",
        variant: "destructive",
      });
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/units/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({
        title: "Sucesso",
        description: "Unidade removida com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover unidade",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      logoUrl: "",
      cnpj: ""
    });
    setEditingUnit(null);
    setShowForm(false);
    setSelectedFile(null);
    setCroppedImageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEdit = (unit: Unit) => {
    setFormData({
      name: unit.name,
      address: unit.address,
      logoUrl: unit.logoUrl || "",
      cnpj: unit.cnpj || ""
    });
    setEditingUnit(unit);
    setShowForm(true);
    setCroppedImageUrl(unit.logoUrl || "");
  };

  const handleSubmit = () => {
    if (editingUnit) {
      updateUnitMutation.mutate({ id: editingUnit.id, data: formData });
    } else {
      createUnitMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta unidade?")) {
      deleteUnitMutation.mutate(id);
    }
  };

  const handleImageCrop = async (croppedImageUrl: string) => {
    try {
      // Convert blob URL to base64
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        try {
          // Upload to server
          const uploadResponse = await apiRequest("POST", "/api/units/upload-logo", {
            imageBlob: base64String
          });
          
          const { logoUrl } = await uploadResponse.json();
          setCroppedImageUrl(logoUrl);
          setFormData({ ...formData, logoUrl });
          
          toast({
            title: "Sucesso",
            description: "Logo carregada com sucesso!",
          });
        } catch (error) {
          toast({
            title: "Erro",
            description: "Erro ao carregar a logo",
            variant: "destructive",
          });
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao processar a imagem",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Gestão de Unidades
          </h2>
          <p className="text-muted-foreground mt-1">
            Gerencie as unidades da empresa
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Unidade
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingUnit ? "Editar Unidade" : "Nova Unidade"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Unidade</Label>
                <Input
                  id="name"
                  placeholder="Ex: Matriz, Filial Centro, etc."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  placeholder="XX.XXX.XXX/XXXX-XX"
                  value={formData.cnpj}
                  onChange={(e) => {
                    const maskedValue = applyCnpjMask(e.target.value);
                    setFormData({ ...formData, cnpj: maskedValue });
                  }}
                  maxLength={18}
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Textarea
                  id="address"
                  placeholder="Endereço completo da unidade"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                />
              </div>
              
              {/* Upload de Logo */}
              <div className="space-y-2 md:col-span-2">
                <Label>Logo da Unidade</Label>
                <div className="flex items-center gap-4">
                  {croppedImageUrl && (
                    <div className="relative">
                      <img 
                        src={croppedImageUrl} 
                        alt="Logo da unidade" 
                        className="w-20 h-20 rounded-lg border object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={() => {
                          setCroppedImageUrl("");
                          setFormData({ ...formData, logoUrl: "" });
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setShowImageCropper(true);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {croppedImageUrl ? "Alterar Logo" : "Adicionar Logo"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      JPEG ou PNG. Será recortada em 100x100px.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSubmit}
                disabled={
                  !formData.name || 
                  !formData.address || 
                  (formData.cnpj && !isValidCnpjFormat(formData.cnpj)) ||
                  createUnitMutation.isPending || 
                  updateUnitMutation.isPending
                }
              >
                {createUnitMutation.isPending || updateUnitMutation.isPending 
                  ? "Salvando..." 
                  : editingUnit ? "Atualizar" : "Criar"
                }
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Unidades Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando unidades...
            </div>
          ) : !units || units.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma unidade cadastrada</p>
              <p className="text-sm">Clique em "Nova Unidade" para começar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.isArray(units) && units.map((unit: Unit) => (
                <Card key={unit.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {unit.logoUrl ? (
                          <img 
                            src={unit.logoUrl} 
                            alt={`Logo ${unit.name}`}
                            className="w-10 h-10 rounded-lg object-cover border"
                          />
                        ) : (
                          <Building2 className="h-5 w-5 text-primary" />
                        )}
                        <div>
                          <h3 className="font-medium text-foreground">{unit.name}</h3>
                          {unit.cnpj && (
                            <p className="text-xs text-muted-foreground">CNPJ: {unit.cnpj}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(unit)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(unit.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {unit.address}
                    </p>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        Criada em {new Date(unit.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Recorte de Imagem */}
      <ImageCropper
        isOpen={showImageCropper}
        onClose={() => setShowImageCropper(false)}
        onCrop={handleImageCrop}
        file={selectedFile}
      />
    </div>
  );
}