import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, MessageSquare, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CompanySettings() {
  const { toast } = useToast();
  const [freelancerUrl, setFreelancerUrl] = useState("");
  const [stockCountUrl, setStockCountUrl] = useState("");

  // Query to get all settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/settings");
      return await response.json();
    }
  });

  // Update state when settings data changes
  React.useEffect(() => {
    if (settings) {
      const freelancerSetting = settings.find((s: Setting) => s.key === "freelancer_webhook_url");
      const stockCountSetting = settings.find((s: Setting) => s.key === "stock_count_webhook_url");
      
      if (freelancerSetting) setFreelancerUrl(freelancerSetting.value);
      if (stockCountSetting) setStockCountUrl(stockCountSetting.value);
    }
  }, [settings]);

  // Mutation to update webhook URLs
  const updateUrlMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await apiRequest("PUT", `/api/settings/${key}`, { value });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Configuração salva",
        description: "URL do webhook atualizada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configuração",
        variant: "destructive",
      });
    },
  });

  // Helper function to validate URL
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  const handleSaveFreelancerUrl = () => {
    if (!freelancerUrl.trim()) {
      toast({
        title: "Erro",
        description: "URL não pode estar vazia",
        variant: "destructive",
      });
      return;
    }

    if (!isValidUrl(freelancerUrl)) {
      toast({
        title: "Erro",
        description: "URL inválida. Use formato: https://exemplo.com/webhook",
        variant: "destructive",
      });
      return;
    }

    updateUrlMutation.mutate({ key: "freelancer_webhook_url", value: freelancerUrl });
  };

  const handleSaveStockCountUrl = () => {
    if (!stockCountUrl.trim()) {
      toast({
        title: "Erro",
        description: "URL não pode estar vazia",
        variant: "destructive",
      });
      return;
    }

    if (!isValidUrl(stockCountUrl)) {
      toast({
        title: "Erro",
        description: "URL inválida. Use formato: https://exemplo.com/webhook",
        variant: "destructive",
      });
      return;
    }

    updateUrlMutation.mutate({ key: "stock_count_webhook_url", value: stockCountUrl });
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-orange-600" />
        <h1 className="text-2xl font-bold text-gray-900">Configurações da Empresa</h1>
      </div>

      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-6">
          {/* Freelancer Webhook Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-orange-600" />
                Webhook para Controle de Ponto
              </CardTitle>
              <CardDescription>
                Configure a URL do webhook para envio de mensagens relacionadas ao controle de ponto dos freelancers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="freelancer-url">URL do Webhook</Label>
                <Input
                  id="freelancer-url"
                  placeholder="https://wpp.donjuarez.com.br/message/sendText/dj-ponto"
                  value={freelancerUrl}
                  onChange={(e) => setFreelancerUrl(e.target.value)}
                  className={!isValidUrl(freelancerUrl) && freelancerUrl ? "border-red-500" : ""}
                />
                {!isValidUrl(freelancerUrl) && freelancerUrl && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    URL inválida. Use formato: https://exemplo.com/webhook
                  </p>
                )}
                {isValidUrl(freelancerUrl) && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    URL válida
                  </p>
                )}
              </div>



              <Button 
                onClick={handleSaveFreelancerUrl}
                disabled={updateUrlMutation.isPending || !freelancerUrl || !isValidUrl(freelancerUrl)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {updateUrlMutation.isPending ? "Salvando..." : "Salvar Configuração"}
              </Button>
            </CardContent>
          </Card>

          {/* Stock Count Webhook Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-orange-600" />
                Webhook para Contagem de Estoque
              </CardTitle>
              <CardDescription>
                Configure a URL do webhook para envio de mensagens relacionadas às contagens de estoque.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stock-count-url">URL do Webhook</Label>
                <Input
                  id="stock-count-url"
                  placeholder="https://wpp.donjuarez.com.br/message/sendText/dj-estoque"
                  value={stockCountUrl}
                  onChange={(e) => setStockCountUrl(e.target.value)}
                  className={!isValidUrl(stockCountUrl) && stockCountUrl ? "border-red-500" : ""}
                />
                {!isValidUrl(stockCountUrl) && stockCountUrl && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    URL inválida. Use formato: https://exemplo.com/webhook
                  </p>
                )}
                {isValidUrl(stockCountUrl) && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    URL válida
                  </p>
                )}
              </div>



              <Button 
                onClick={handleSaveStockCountUrl}
                disabled={updateUrlMutation.isPending || !stockCountUrl || !isValidUrl(stockCountUrl)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {updateUrlMutation.isPending ? "Salvando..." : "Salvar Configuração"}
              </Button>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800">Informações Importantes</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700 space-y-2">
              <p>• As URLs configuradas serão usadas para enviar mensagens WhatsApp automaticamente</p>
              <p>• Webhook de Controle de Ponto: usado para comunicação com freelancers</p>
              <p>• Webhook de Contagem de Estoque: usado para notificar sobre contagens</p>
              <p>• As configurações são aplicadas imediatamente após salvar</p>
              <p>• Certifique-se de que as URLs estão corretas e acessíveis</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}